import { prisma } from './prisma';

export interface DashboardStats {
  summary: {
    totalApplications: number;
    pendingCount: number;
    escalatedCount: number;
    completedCount: number;
    approvalRatePercent: number;
    avgDtiPercent: number;
    avgPdPercent: number;
    totalLoanVolume: number;
    avgLoanAmount: number;
  };
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  riskTierBreakdown: Array<{ tier: string; count: number; avgPD: number }>;
  dtiBands: Array<{ band: string; count: number; avgPD: number; approvalRate: number }>;
  recentTimeline: Array<{ date: string; count: number; volume: number }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Query all underwriting applications with their assessments
  const apps = await prisma.underwritingApplication.findMany({
    include: {
      assessment: true,
    },
  });

  const total = apps.length;
  const pending = apps.filter((a) => a.status === 'PENDING').length;
  const escalated = apps.filter((a) => a.status === 'ESCALATED').length;
  const approved = apps.filter((a) => a.status === 'APPROVED').length;
  const declined = apps.filter((a) => a.status === 'DECLINED').length;
  const completed = approved + declined;

  const approvalRatePercent = completed > 0 ? (approved / completed) * 100 : 0;

  // Summarize DTI Ratios
  const totalDti = apps.reduce((s, a) => s + (a.dtiRatio ?? 0), 0);
  const avgDtiPercent = total > 0 ? (totalDti / total) * 100 : 0;

  // Summarize Probability of Default
  const appsWithPd = apps.filter((a) => a.assessment?.defaultProbability !== undefined);
  const totalPd = appsWithPd.reduce((s, a) => s + (a.assessment?.defaultProbability ?? 0), 0);
  const avgPdPercent = appsWithPd.length > 0 ? (totalPd / appsWithPd.length) * 100 : 0;

  // Loan Volume
  const totalVolume = apps.reduce((s, a) => s + (a.loanAmount ?? 0), 0);
  const avgLoan = total > 0 ? totalVolume / total : 0;

  // 1. Status Distribution
  const statusDistribution = [
    { name: 'Approved', value: approved, color: 'hsl(142.1 76.2% 36.3%)' },
    { name: 'Declined', value: declined, color: 'hsl(0 72% 51%)' },
    { name: 'Pending', value: pending, color: 'hsl(221.2 83.2% 53.3%)' },
    { name: 'Escalated', value: escalated, color: 'hsl(38 92% 50%)' },
  ].filter((item) => item.value > 0);

  // 2. Risk Tier Distribution
  const tiers = ['low', 'medium', 'high', 'very_high'];
  const riskTierBreakdown = tiers.map((tier) => {
    const tierApps = apps.filter((a) => a.assessment?.riskTier === tier);
    const tierPdSum = tierApps.reduce((s, a) => s + (a.assessment?.defaultProbability ?? 0), 0);
    const avgPD = tierApps.length > 0 ? (tierPdSum / tierApps.length) * 100 : 0;
    return {
      tier: tier.replace('_', ' ').toUpperCase(),
      count: tierApps.length,
      avgPD: Math.round(avgPD * 10) / 10,
    };
  });

  // 3. DTI Bands
  // <20%, 20-35%, 35-50%, 50%+
  const bands = [
    { label: '< 20%', min: 0, max: 0.2 },
    { label: '20% - 35%', min: 0.2, max: 0.35 },
    { label: '35% - 50%', min: 0.35, max: 0.5 },
    { label: '50%+', min: 0.5, max: Infinity },
  ];

  const dtiBands = bands.map((b) => {
    const bandApps = apps.filter((a) => a.dtiRatio >= b.min && a.dtiRatio < b.max);
    const bandPdSum = bandApps.reduce((s, a) => s + (a.assessment?.defaultProbability ?? 0), 0);
    const avgPD = bandApps.length > 0 ? (bandPdSum / bandApps.length) * 100 : 0;

    const bandApproved = bandApps.filter((a) => a.status === 'APPROVED').length;
    const bandCompleted = bandApps.filter((a) => a.status === 'APPROVED' || a.status === 'DECLINED').length;
    const rate = bandCompleted > 0 ? (bandApproved / bandCompleted) * 100 : 0;

    return {
      band: b.label,
      count: bandApps.length,
      avgPD: Math.round(avgPD * 10) / 10,
      approvalRate: Math.round(rate * 10) / 10,
    };
  });

  // 4. Timeline (Recent Submissions grouped by date)
  // Format dates as YYYY-MM-DD
  const dateGroups: Record<string, { count: number; volume: number }> = {};
  apps.forEach((a) => {
    const dateStr = a.submissionDate.toISOString().split('T')[0];
    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = { count: 0, volume: 0 };
    }
    dateGroups[dateStr].count += 1;
    dateGroups[dateStr].volume += a.loanAmount;
  });

  // Convert to sorted array of recent dates
  const recentTimeline = Object.entries(dateGroups)
    .map(([date, data]) => ({
      date,
      count: data.count,
      volume: data.volume,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7); // Keep last 7 days with activity

  // If the seed dates are sparse, let's make sure we have at least some days
  if (recentTimeline.length === 0) {
    recentTimeline.push({
      date: new Date().toISOString().split('T')[0],
      count: 0,
      volume: 0,
    });
  }

  return {
    summary: {
      totalApplications: total,
      pendingCount: pending,
      escalatedCount: escalated,
      completedCount: completed,
      approvalRatePercent: Math.round(approvalRatePercent * 10) / 10,
      avgDtiPercent: Math.round(avgDtiPercent * 10) / 10,
      avgPdPercent: Math.round(avgPdPercent * 10) / 10,
      totalLoanVolume: totalVolume,
      avgLoanAmount: Math.round(avgLoan),
    },
    statusDistribution,
    riskTierBreakdown,
    dtiBands,
    recentTimeline,
  };
}
