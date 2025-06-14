'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Organization, FundVault } from '@/lib/types/database';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';

interface DashboardClientProps {
  user: User;
  organization: Organization | null;
}

export default function DashboardClient({ user, organization }: DashboardClientProps) {
  const [fundVaults, setFundVaults] = useState<FundVault[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchFundVaults();
  }, []);

  const fetchFundVaults = async () => {
    try {
      const { data, error } = await supabase
        .from('fund_vaults')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFundVaults(data || []);
    } catch (error) {
      console.error('Error fetching fund vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black bg-opacity-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">God's Hand Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KYB Status Section */}
        <div className="mb-8">
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Organization Status</h2>
            
            {!organization ? (
              <div className="text-center py-8">
                <p className="text-gray-300 mb-4">
                  You need to complete your organization verification before you can claim funds.
                </p>
                <Link
                  href="/kyb"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  Start KYB Verification
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black bg-opacity-20 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300">Organization</h3>
                  <p className="text-lg font-semibold text-white">{organization.organization_name}</p>
                </div>
                <div className="bg-black bg-opacity-20 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300">KYB Status</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    organization.kyb_status === 'approved' 
                      ? 'bg-green-100 text-green-800'
                      : organization.kyb_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : organization.kyb_status === 'in_review'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {organization.kyb_status?.toUpperCase()}
                  </span>
                </div>
                <div className="bg-black bg-opacity-20 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300">Risk Rating</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    organization.risk_rating === 'low' 
                      ? 'bg-green-100 text-green-800'
                      : organization.risk_rating === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {organization.risk_rating?.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fund Vaults Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Available Fund Vaults</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="text-gray-300 mt-4">Loading fund vaults...</p>
            </div>
          ) : fundVaults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-300">No active fund vaults available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fundVaults.map((vault) => (
                <div key={vault.id} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{vault.vault_name}</h3>
                  <p className="text-gray-300 mb-2">
                    <span className="font-medium">Type:</span> {vault.disaster_type}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <span className="font-medium">Location:</span> {vault.location}
                  </p>
                  <p className="text-gray-300 mb-4">
                    <span className="font-medium">Available:</span> ${vault.remaining_amount?.toLocaleString() || '0'}
                  </p>
                  
                  {organization?.kyb_status === 'approved' ? (
                    <Link
                      href={`/petition/${vault.id}`}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md text-center block"
                    >
                      Submit Petition
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-600 text-gray-400 font-medium py-2 px-4 rounded-md cursor-not-allowed"
                    >
                      Complete KYB First
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {organization && (
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/kyb"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md text-center"
              >
                Update Organization Info
              </Link>
              <Link
                href="/petitions"
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md text-center"
              >
                View My Petitions
              </Link>
              <Link
                href="/documents"
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded-md text-center"
              >
                Manage Documents
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 