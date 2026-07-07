import { getAnalyticsData } from '@/lib/analytics';
import { OperationsClient } from './OperationsClient';

export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  const data = await getAnalyticsData();
  return <OperationsClient data={data} />;
}
