import { getDashboardStats } from '@/lib/dashboard';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  return <DashboardClient data={stats} />;
}
