import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has an organization
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return <DashboardClient user={user} organization={organization} />;
} 