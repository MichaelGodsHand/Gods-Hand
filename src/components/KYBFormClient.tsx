'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Organization, OrganizationFormData, UBOFormData, LEGAL_STRUCTURES, INDUSTRY_SECTORS, KYB_DOCUMENT_TYPES } from '@/lib/types/database';
import { useRouter } from 'next/navigation';

interface KYBFormClientProps {
  user: User;
  existingOrganization: Organization | null;
}

interface FormStep {
  id: number;
  title: string;
  description: string;
}

const FORM_STEPS: FormStep[] = [
  { id: 1, title: 'Basic Information', description: 'Organization details and structure' },
  { id: 2, title: 'Contact & Address', description: 'Registered and operating addresses' },
  { id: 3, title: 'Business Details', description: 'Industry, revenue, and operations' },
  { id: 4, title: 'Banking Information', description: 'Financial account details' },
  { id: 5, title: 'Ultimate Beneficial Owners', description: 'UBO information and ownership' },
  { id: 6, title: 'Documents Upload', description: 'Required verification documents' },
  { id: 7, title: 'Review & Submit', description: 'Final review and submission' }
];

export default function KYBFormClient({ user, existingOrganization }: KYBFormClientProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [documents, setDocuments] = useState<{ [key: string]: File }>({});
  const [ubos, setUbos] = useState<UBOFormData[]>([]);
  
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data state
  const [formData, setFormData] = useState<OrganizationFormData>({
    organization_name: existingOrganization?.organization_name || '',
    legal_name: existingOrganization?.legal_name || '',
    trading_name: existingOrganization?.trading_name || '',
    registration_number: existingOrganization?.registration_number || '',
    tax_identification_number: existingOrganization?.tax_identification_number || '',
    vat_number: existingOrganization?.vat_number || '',
    legal_structure: existingOrganization?.legal_structure || '',
    incorporation_date: existingOrganization?.incorporation_date || '',
    incorporation_country: existingOrganization?.incorporation_country || '',
    incorporation_state: existingOrganization?.incorporation_state || '',
    registered_address_line1: existingOrganization?.registered_address_line1 || '',
    registered_address_line2: existingOrganization?.registered_address_line2 || '',
    registered_city: existingOrganization?.registered_city || '',
    registered_state: existingOrganization?.registered_state || '',
    registered_postal_code: existingOrganization?.registered_postal_code || '',
    registered_country: existingOrganization?.registered_country || '',
    operating_address_line1: existingOrganization?.operating_address_line1 || '',
    operating_address_line2: existingOrganization?.operating_address_line2 || '',
    operating_city: existingOrganization?.operating_city || '',
    operating_state: existingOrganization?.operating_state || '',
    operating_postal_code: existingOrganization?.operating_postal_code || '',
    operating_country: existingOrganization?.operating_country || '',
    phone_number: existingOrganization?.phone_number || '',
    email: existingOrganization?.email || '',
    website: existingOrganization?.website || '',
    industry_sector: existingOrganization?.industry_sector || '',
    business_description: existingOrganization?.business_description || '',
    naics_code: existingOrganization?.naics_code || '',
    sic_code: existingOrganization?.sic_code || '',
    annual_revenue: existingOrganization?.annual_revenue || undefined,
    number_of_employees: existingOrganization?.number_of_employees || undefined,
    bank_name: existingOrganization?.bank_name || '',
    bank_account_number: existingOrganization?.bank_account_number || '',
    bank_routing_number: existingOrganization?.bank_routing_number || '',
    iban: existingOrganization?.iban || '',
    swift_code: existingOrganization?.swift_code || '',
    politically_exposed: existingOrganization?.politically_exposed || false,
    high_risk_jurisdiction: existingOrganization?.high_risk_jurisdiction || false,
  });

  const handleInputChange = (field: keyof OrganizationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentUpload = (documentType: string, file: File) => {
    setDocuments(prev => ({ ...prev, [documentType]: file }));
  };

  const addUBO = () => {
    setUbos(prev => [...prev, {
      first_name: '',
      last_name: '',
      ownership_percentage: 0,
      position_title: ''
    }]);
  };

  const updateUBO = (index: number, field: keyof UBOFormData, value: any) => {
    setUbos(prev => prev.map((ubo, i) => 
      i === index ? { ...ubo, [field]: value } : ubo
    ));
  };

  const removeUBO = (index: number) => {
    setUbos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      let logoUrl = existingOrganization?.logo_url;

      // Upload logo if provided
      if (logoFile) {
        const logoPath = `${user.id}/logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        await uploadFile(logoFile, 'organization-logos', logoPath);
        const { data: { publicUrl } } = supabase.storage
          .from('organization-logos')
          .getPublicUrl(logoPath);
        logoUrl = publicUrl;
      }

      // Create or update organization
      const organizationData = {
        ...formData,
        user_id: user.id,
        logo_url: logoUrl,
        kyb_status: 'pending' as const
      };

      let organizationId: string;

      if (existingOrganization) {
        const { error } = await supabase
          .from('organizations')
          .update(organizationData)
          .eq('id', existingOrganization.id);

        if (error) throw error;
        organizationId = existingOrganization.id;
      } else {
        const { data, error } = await supabase
          .from('organizations')
          .insert(organizationData)
          .select()
          .single();

        if (error) throw error;
        organizationId = data.id;
      }

      // Insert UBOs
      if (ubos.length > 0) {
        const uboData = ubos.map(ubo => ({
          ...ubo,
          organization_id: organizationId
        }));

        const { error: uboError } = await supabase
          .from('ultimate_beneficial_owners')
          .upsert(uboData);

        if (uboError) throw uboError;
      }

      // Upload documents
      for (const [documentType, file] of Object.entries(documents)) {
        const documentPath = `${user.id}/documents/${documentType}-${Date.now()}.${file.name.split('.').pop()}`;
        await uploadFile(file, 'kyb-documents', documentPath);

        const { error: docError } = await supabase
          .from('kyb_documents')
          .insert({
            organization_id: organizationId,
            document_type: documentType,
            document_name: file.name,
            file_path: documentPath,
            file_size: file.size,
            mime_type: file.type
          });

        if (docError) throw docError;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < FORM_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Basic Organization Information</h3>
            
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization Logo
              </label>
              <div className="flex items-center space-x-4">
                {logoPreview && (
                  <img src={logoPreview} alt="Logo preview" className="w-16 h-16 object-cover rounded-lg" />
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Upload Logo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.organization_name}
                  onChange={(e) => handleInputChange('organization_name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Legal Name
                </label>
                <input
                  type="text"
                  value={formData.legal_name}
                  onChange={(e) => handleInputChange('legal_name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trading Name
                </label>
                <input
                  type="text"
                  value={formData.trading_name}
                  onChange={(e) => handleInputChange('trading_name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Legal Structure
                </label>
                <select
                  value={formData.legal_structure}
                  onChange={(e) => handleInputChange('legal_structure', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Legal Structure</option>
                  {Object.entries(LEGAL_STRUCTURES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={formData.registration_number}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tax Identification Number
                </label>
                <input
                  type="text"
                  value={formData.tax_identification_number}
                  onChange={(e) => handleInputChange('tax_identification_number', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Incorporation Date
                </label>
                <input
                  type="date"
                  value={formData.incorporation_date}
                  onChange={(e) => handleInputChange('incorporation_date', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Incorporation Country
                </label>
                <input
                  type="text"
                  value={formData.incorporation_country}
                  onChange={(e) => handleInputChange('incorporation_country', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="US, UK, CA, etc."
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Contact & Address Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Registered Address */}
              <div>
                <h4 className="text-md font-medium text-gray-300 mb-4">Registered Address</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={formData.registered_address_line1}
                    onChange={(e) => handleInputChange('registered_address_line1', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2"
                    value={formData.registered_address_line2}
                    onChange={(e) => handleInputChange('registered_address_line2', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.registered_city}
                      onChange={(e) => handleInputChange('registered_city', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="State/Province"
                      value={formData.registered_state}
                      onChange={(e) => handleInputChange('registered_state', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={formData.registered_postal_code}
                      onChange={(e) => handleInputChange('registered_postal_code', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.registered_country}
                      onChange={(e) => handleInputChange('registered_country', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Address */}
              <div>
                <h4 className="text-md font-medium text-gray-300 mb-4">Operating Address</h4>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Address Line 1"
                    value={formData.operating_address_line1}
                    onChange={(e) => handleInputChange('operating_address_line1', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Address Line 2"
                    value={formData.operating_address_line2}
                    onChange={(e) => handleInputChange('operating_address_line2', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.operating_city}
                      onChange={(e) => handleInputChange('operating_city', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="State/Province"
                      value={formData.operating_state}
                      onChange={(e) => handleInputChange('operating_state', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={formData.operating_postal_code}
                      onChange={(e) => handleInputChange('operating_postal_code', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={formData.operating_country}
                      onChange={(e) => handleInputChange('operating_country', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h4 className="text-md font-medium text-gray-300 mb-4">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="url"
                  placeholder="Website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Business Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Industry Sector
                </label>
                <select
                  value={formData.industry_sector}
                  onChange={(e) => handleInputChange('industry_sector', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Industry</option>
                  {Object.entries(INDUSTRY_SECTORS).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  NAICS Code
                </label>
                <input
                  type="text"
                  value={formData.naics_code}
                  onChange={(e) => handleInputChange('naics_code', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="6-digit NAICS code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Annual Revenue (USD)
                </label>
                <input
                  type="number"
                  value={formData.annual_revenue || ''}
                  onChange={(e) => handleInputChange('annual_revenue', parseFloat(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Employees
                </label>
                <input
                  type="number"
                  value={formData.number_of_employees || ''}
                  onChange={(e) => handleInputChange('number_of_employees', parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Description
              </label>
              <textarea
                rows={4}
                value={formData.business_description}
                onChange={(e) => handleInputChange('business_description', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe your organization's activities and mission..."
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-300">Risk Assessment</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.politically_exposed}
                    onChange={(e) => handleInputChange('politically_exposed', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Organization has politically exposed persons</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.high_risk_jurisdiction}
                    onChange={(e) => handleInputChange('high_risk_jurisdiction', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Organization operates in high-risk jurisdictions</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Banking Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.bank_account_number}
                  onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={formData.bank_routing_number}
                  onChange={(e) => handleInputChange('bank_routing_number', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  SWIFT Code
                </label>
                <input
                  type="text"
                  value={formData.swift_code}
                  onChange={(e) => handleInputChange('swift_code', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => handleInputChange('iban', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Ultimate Beneficial Owners</h3>
              <button
                type="button"
                onClick={addUBO}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Add UBO
              </button>
            </div>

            {ubos.map((ubo, index) => (
              <div key={index} className="bg-gray-800 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-300">UBO #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeUBO(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={ubo.first_name}
                    onChange={(e) => updateUBO(index, 'first_name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={ubo.last_name}
                    onChange={(e) => updateUBO(index, 'last_name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Position Title"
                    value={ubo.position_title}
                    onChange={(e) => updateUBO(index, 'position_title', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="number"
                    placeholder="Ownership %"
                    value={ubo.ownership_percentage}
                    onChange={(e) => updateUBO(index, 'ownership_percentage', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Required Documents</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(KYB_DOCUMENT_TYPES).map(([key, value]) => (
                <div key={key} className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    {value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentUpload(value, file);
                    }}
                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                  />
                  {documents[value] && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ {documents[value].name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Review & Submit</h3>
            
            <div className="bg-gray-800 p-6 rounded-lg">
              <h4 className="text-md font-medium text-gray-300 mb-4">Organization Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Organization Name:</span>
                  <span className="text-white ml-2">{formData.organization_name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Legal Structure:</span>
                  <span className="text-white ml-2">{formData.legal_structure}</span>
                </div>
                <div>
                  <span className="text-gray-400">Industry:</span>
                  <span className="text-white ml-2">{formData.industry_sector}</span>
                </div>
                <div>
                  <span className="text-gray-400">UBOs:</span>
                  <span className="text-white ml-2">{ubos.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Documents:</span>
                  <span className="text-white ml-2">{Object.keys(documents).length}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900 border border-yellow-700 p-4 rounded-lg">
              <p className="text-yellow-100 text-sm">
                By submitting this form, you confirm that all information provided is accurate and complete. 
                Your organization will undergo KYB verification which may take 3-5 business days.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step.id 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {step.id}
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div className={`w-12 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-purple-600' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-white">
              {FORM_STEPS[currentStep - 1].title}
            </h2>
            <p className="text-gray-300 text-sm">
              {FORM_STEPS[currentStep - 1].description}
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8">
          {renderStep()}

          {error && (
            <div className="mt-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 bg-gray-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
            >
              Previous
            </button>

            {currentStep < FORM_STEPS.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Submitting...' : 'Submit KYB Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 