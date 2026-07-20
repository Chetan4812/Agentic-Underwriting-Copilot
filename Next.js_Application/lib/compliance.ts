import { prisma } from './prisma';

export interface CohortRow {
  cohort: string;
  approvalRate: number;
  declineRate: number;
  sample: number;
}

export interface FairnessData {
  gender: CohortRow[];
  age: CohortRow[];
  approvalRateGap: number;
  gapThreshold: number;
  alert: boolean;
}

export async function getFairnessData(): Promise<FairnessData> {
  const apps = await prisma.underwritingApplication.findMany({
    include: { assessment: true },
  });

  type Bucket = { total: number; approved: number; declined: number };
  const byGender: Record<string, Bucket> = {};
  const byAge: Record<string, Bucket> = {};

  function bump(map: Record<string, Bucket>, key: string, status: string) {
    if (!key) return;
    map[key] ??= { total: 0, approved: 0, declined: 0 };
    if (status === 'APPROVED') map[key].approved++;
    if (status === 'DECLINED') map[key].declined++;
    if (status === 'APPROVED' || status === 'DECLINED') map[key].total++;
  }

  for (const a of apps) {
    const file = (a.applicantFile as any) ?? {};
    bump(byGender, file.gender ?? 'Unknown', a.status);
    bump(byAge, file.age_group ?? 'Unknown', a.status);
  }

  function toRows(map: Record<string, Bucket>): CohortRow[] {
    return Object.entries(map).map(([key, b]) => ({
      cohort: key,
      approvalRate: b.total ? b.approved / b.total : 0,
      declineRate: b.total ? b.declined / b.total : 0,
      sample: b.total,
    }));
  }

  const genderRows = toRows(byGender);
  const ageRows = toRows(byAge);

  const rates = genderRows.map((r) => r.approvalRate);
  const gap = rates.length ? Math.max(...rates) - Math.min(...rates) : 0;

  return {
    gender: genderRows,
    age: ageRows,
    approvalRateGap: gap,
    gapThreshold: 0.05,
    alert: gap > 0.05,
  };
}
