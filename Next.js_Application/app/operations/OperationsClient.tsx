'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatUsdMicros } from '@/lib/utils';
import { CostProjections } from '@/components/CostProjections';
import { TrendingUp, Clock, Coins, Database, Activity } from 'lucide-react';

interface ThroughputPoint {
  hour: string;
  cases: number;
  p95Latency: number;
}
interface AnalyticsData {
  totalApplications: number;
  completedApplications: number;
  cumulativeCostUsd: number;
  avgCostPerApplicationUsd: number;
  avgCostTarget: number;
  p95LatencyTargetSeconds: number;
  throughput: ThroughputPoint[];
}

const chartMargin = { top: 8, right: 12, left: -22, bottom: 8 };
const gridStroke = 'hsl(214.3 31.8% 91.4%)';
const tooltipStyle = {
  background: 'hsl(222 44% 8%)',
  border: '1px solid hsl(217 33% 20%)',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(210 40% 96%)',
};
const latencyTargetLabel = { value: 'Target', position: 'right' as const, fill: 'hsl(0 72% 51%)', fontSize: 10 };

export function OperationsClient({ data }: { data: AnalyticsData }) {
  const isAvgUnderTarget = data.avgCostPerApplicationUsd <= data.avgCostTarget;
  const totalCases = data.throughput.reduce((s, p) => s + p.cases, 0);
  const maxP95 = Math.max(...data.throughput.map((p) => p.p95Latency), 0);
  const isLatencyUnderTarget = maxP95 <= data.p95LatencyTargetSeconds;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Operations &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Real-time system throughput, SLA response latency, and LLM orchestration governance.
        </p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cases throughput */}
        <Card className="border border-border/85 hover:border-primary/40 transition-all duration-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cases (Last 8h)
              </span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{totalCases}</span>
              <span className="text-xs text-muted-foreground">outcomes</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-medium">Rolling pipeline processing volume</p>
          </CardContent>
        </Card>

        {/* SLA Latency */}
        <Card className={`border border-border/85 hover:border-success/40 transition-all duration-200 shadow-sm ${!isLatencyUnderTarget ? 'border-warning/30 bg-warning/5' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Peak p95 Latency
              </span>
              <Clock className={`h-4 w-4 ${isLatencyUnderTarget ? 'text-success' : 'text-warning'}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${isLatencyUnderTarget ? 'text-success' : 'text-warning'}`}>
                {maxP95}s
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-medium">
              SLA SLA limit: ≤ {data.p95LatencyTargetSeconds}s
            </p>
          </CardContent>
        </Card>

        {/* Avg cost */}
        <Card className={`border border-border/85 hover:border-primary/40 transition-all duration-200 shadow-sm ${!isAvgUnderTarget ? 'border-destructive/30 bg-destructive/5' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg Cost / Case
              </span>
              <Coins className={`h-4 w-4 ${isAvgUnderTarget ? 'text-primary' : 'text-destructive'}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${isAvgUnderTarget ? 'text-primary' : 'text-destructive'}`}>
                {formatUsdMicros(data.avgCostPerApplicationUsd)}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-medium">
              Budget target limit: ≤ ${data.avgCostTarget.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Cumulative LLM cost */}
        <Card className="border border-border/85 hover:border-primary/40 transition-all duration-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total LLM Spend
              </span>
              <Database className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{formatUsdMicros(data.cumulativeCostUsd)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-medium">
              {data.completedApplications} / {data.totalApplications} completions actioned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Projections simulation */}
      <CostProjections />

      {/* Recharts Charts Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Cases Throughput curve */}
        <Card className="border border-border/80 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Throughput Timeline</CardTitle>
            <CardDescription className="text-xs">
              Rolling applications processed per hour over the current monitoring session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.throughput} margin={chartMargin}>
                  <defs>
                    <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="hour" stroke="hsl(240 3.8% 46.1%)" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(240 3.8% 46.1%)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, 'Processed Cases']} />
                  <Area
                    type="monotone"
                    dataKey="cases"
                    stroke="hsl(221.2 83.2% 53.3%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCases)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* p95 Response Latency */}
        <Card className="border border-border/80 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">p95 Latency SLA</CardTitle>
            <CardDescription className="text-xs">
              SLA execution latency profile tracking model inference and agent cycles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.throughput} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="hour" stroke="hsl(240 3.8% 46.1%)" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(240 3.8% 46.1%)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}s`, 'p95 Latency']} />
                  <ReferenceLine
                    y={data.p95LatencyTargetSeconds}
                    stroke="hsl(0 72% 51%)"
                    strokeDasharray="4 4"
                    label={latencyTargetLabel}
                  />
                  <Line
                    type="monotone"
                    dataKey="p95Latency"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(38 92% 50%)', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
