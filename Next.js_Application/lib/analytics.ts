import { prisma } from './prisma';

export interface ThroughputPoint {
  hour: string;
  cases: number;
  p95Latency: number;
}

export interface AnalyticsData {
  totalApplications: number;
  completedApplications: number;
  cumulativeCostUsd: number;
  avgCostPerApplicationUsd: number;
  avgCostTarget: number;
  p95LatencyTargetSeconds: number;
  throughput: ThroughputPoint[];
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const [total, completed, decisions] = await Promise.all([
    prisma.underwritingApplication.count(),
    prisma.underwritingApplication.count({ where: { status: { in: ['APPROVED', 'DECLINED'] } } }),
    prisma.decisionRecord.findMany({ select: { finalCostUsd: true, actionedAt: true } }),
  ]);

  const cumulativeCost = decisions.reduce((s, d) => s + (d.finalCostUsd ?? 0), 0);
  const avgCost = decisions.length ? cumulativeCost / decisions.length : 0;

  // Demo throughput series (cases/hr) over the last 8 hours.
  const now = new Date();
  const throughput = Array.from({ length: 8 }).map((_, i) => {
    const hour = new Date(now.getTime() - (7 - i) * 3600_000);
    return {
      hour: `${hour.getHours()}:00`,
      cases: Math.round(6 + Math.sin(i / 1.5) * 4 + Math.random() * 3),
      p95Latency: Math.round(18 + Math.cos(i / 2) * 6 + Math.random() * 4),
    };
  });

  return {
    totalApplications: total,
    completedApplications: completed,
    cumulativeCostUsd: cumulativeCost,
    avgCostPerApplicationUsd: avgCost,
    avgCostTarget: 0.05,
    p95LatencyTargetSeconds: 30,
    throughput,
  };
}
