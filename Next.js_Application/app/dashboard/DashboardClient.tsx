'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Coins,
  Percent,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface DashboardStatsProps {
  data: {
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
  };
}

const tooltipStyle = {
  background: 'hsl(0 0% 100%)',
  border: '1px solid hsl(214.3 31.8% 91.4%)',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  fontSize: '12px',
  color: 'hsl(222.2 84% 4.9%)',
};

export function DashboardClient({ data }: DashboardStatsProps) {
  const { summary, statusDistribution, riskTierBreakdown, dtiBands, recentTimeline } = data;

  // Format currency helper
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Block */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Portfolio Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time underwriting performance metrics, risk-tier analysis, and processing trends.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-lg border border-border">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          Live Feed Active
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Applications */}
        <Card className="relative overflow-hidden border border-border/80 hover:border-primary/45 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Applications
              </span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{summary.totalApplications}</span>
              <span className="text-xs text-muted-foreground">cases</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-primary font-medium">{summary.pendingCount} pending</span>
              <span>•</span>
              <span className="text-warning font-medium">{summary.escalatedCount} escalated</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Approval Rate */}
        <Card className="relative overflow-hidden border border-border/80 hover:border-success/45 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Approval Rate
              </span>
              <Percent className="h-4 w-4 text-success" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-success">
                {summary.approvalRatePercent}%
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span>Based on {summary.completedCount} finalized decisions</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Avg DTI Ratio */}
        <Card className="relative overflow-hidden border border-border/80 hover:border-warning/45 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg DTI Ratio
              </span>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-warning">{summary.avgDtiPercent}%</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-success" />
              <span>Target maximum limit: 50%</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Portfolio Volume */}
        <Card className="relative overflow-hidden border border-border/80 hover:border-primary/45 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Loan Volume
              </span>
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatUSD(summary.totalLoanVolume)}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Avg loan size:</span>
              <span className="text-foreground font-semibold">{formatUSD(summary.avgLoanAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Charts (Status & Risk) */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Status Distribution (Pie Chart) */}
        <Card className="lg:col-span-5 border border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Application Status Mix</CardTitle>
            <CardDescription className="text-xs">Current composition of application queue states.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="relative h-[250px] w-full flex items-center justify-center">
              {/* Centered Total Indicator */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none pb-4">
                <span className="text-3xl font-extrabold text-slate-900 leading-none">{summary.totalApplications}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1.5">Total</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-muted-foreground font-semibold">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Tier & PD Analysis (Dual-Axis Composed Chart) */}
        <Card className="lg:col-span-7 border border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Risk Tier & Default Probability</CardTitle>
            <CardDescription className="text-xs">
              Comparison of active pipeline volumes versus average Probability of Default (PD).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={riskTierBreakdown} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" />
                  <XAxis dataKey="tier" stroke="hsl(240 3.8% 46.1%)" fontSize={11} tickLine={false} />
                  {/* Left Y Axis: Count */}
                  <YAxis yAxisId="left" stroke="hsl(221.2 83.2% 53.3%)" fontSize={11} label={{ value: 'Applications', angle: -90, position: 'insideLeft', style: { fill: 'hsl(221.2 83.2% 53.3%)', fontSize: 10 } }} tickLine={false} />
                  {/* Right Y Axis: PD % */}
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(38 92% 50%)" fontSize={11} unit="%" label={{ value: 'Avg PD (%)', angle: 90, position: 'insideRight', style: { fill: 'hsl(38 92% 50%)', fontSize: 10 } }} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar yAxisId="left" dataKey="count" fill="hsl(221.2 83.2% 53.3% / 0.75)" radius={[4, 4, 0, 0]}>
                    {riskTierBreakdown.map((entry, idx) => {
                      const colors = {
                        LOW: 'hsl(142.1 76.2% 36.3% / 0.75)',
                        MEDIUM: 'hsl(221.2 83.2% 53.3% / 0.75)',
                        HIGH: 'hsl(38 92% 50% / 0.75)',
                        'VERY HIGH': 'hsl(0 72% 51% / 0.75)',
                      };
                      const fillVal = colors[entry.tier as keyof typeof colors] || 'hsl(221.2 83.2% 53.3% / 0.75)';
                      return <Cell key={`bar-cell-${idx}`} fill={fillVal} />;
                    })}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="avgPD" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ fill: 'hsl(38 92% 50%)', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Charts (DTI Bands & Timeline) */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* DTI Brackets vs Default Prob and Approval Rate */}
        <Card className="border border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">DTI Band Metrics Matrix</CardTitle>
            <CardDescription className="text-xs">
              Correlation of Debt-to-Income brackets with average PD and finalized approval rates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dtiBands} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" />
                  <XAxis dataKey="band" stroke="hsl(240 3.8% 46.1%)" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(240 3.8% 46.1%)" fontSize={11} unit="%" tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="top" height={36} iconType="rect" iconSize={10} formatter={(value) => <span className="text-xs text-muted-foreground">{value === 'avgPD' ? 'Avg PD (%)' : 'Approval Rate (%)'}</span>} />
                  <Area type="monotone" dataKey="approvalRate" fill="hsl(142 71% 45% / 0.15)" stroke="hsl(142 71% 45%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="avgPD" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ fill: 'hsl(0 72% 51%)', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Timeline Loan Volume */}
        <Card className="border border-border bg-card/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Submission Volume Trend</CardTitle>
            <CardDescription className="text-xs">
              Timeline of daily application count and aggregate capital requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" />
                  <XAxis dataKey="date" stroke="hsl(240 3.8% 46.1%)" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(240 3.8% 46.1%)" fontSize={11} tickLine={false} tickFormatter={(tick) => formatUSD(tick)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [name === 'volume' ? formatUSD(value as number) : value, name === 'volume' ? 'Requested Volume' : 'Applications']} />
                  <Area type="monotone" dataKey="volume" stroke="hsl(221.2 83.2% 53.3%)" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
