import { getFairnessData } from '@/lib/compliance';
import { ComplianceClient } from './ComplianceClient';

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  const data = await getFairnessData();
  return <ComplianceClient data={data} />;
}
