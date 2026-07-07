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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { formatUsdMicros } from '@/lib/utils';
import { CostProjections } from '@/components/CostProjections';

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

const chartMargin = { top: 8, right: 12, left: -16, bottom: 8 };
const gridStroke = 'hsl(217 33% 20%)';
const tooltipStyle = {
  background: 'hsl(222 44% 8%)',
  border: '1px solid hsl(217 33% 20%)',
  borderRadius: 8,
  fontSize: 12,
};
const latencyTargetLabel = { value: 'Target', position: 'right' as const, fill: 'hsl(0 72% 60%)', fontSize: 10 };

export function OperationsClient({ data }: { data: AnalyticsData }) {
  const avgTone = data.avgCostPerApplicationUsd <= data.avgCostTarget ? 'success' : 'destructive';
  const totalCases = data.throughput.reduce((s, p) => s + p.cases, 0);
  const maxP95 = Math.max(...data.throughput.map((p) => p.p95Latency), 0);
  const latencyTone = maxP95 <= data.p95LatencyTargetSeconds ? 'success' : 'warning';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Operations &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground">Throughput, latency and LLM cost governance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Cases (last 8h)" value={String(totalCases)} hint="Rolling throughput" />
        <StatCard
          label="Peak p95 latency"
          value={`${maxP95}s`}
          hint={`Target ≤ ${data.p95LatencyTargetSeconds}s`}
          tone={latencyTone}
        />
        <StatCard
          label="Avg cost / application"
          value={formatUsdMicros(data.avgCostPerApplicationUsd)}
          hint={`Target ≤ $${data.avgCostTarget.toFixed(2)}`}
          tone={avgTone}
        />
        <StatCard
          label="Cumulative LLM cost"
          value={formatUsdMicros(data.cumulativeCostUsd)}
          hint={`${data.completedApplications}/${data.totalApplications} completed`}
        />
      </div>

      <CostProjections />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Throughput (cases / hr)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.throughput} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="hour" stroke="hsl(215 20% 65%)" fontSize={11} />
                  <YAxis stroke="hsl(215 20% 65%)" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="cases" stroke="hsl(199 89% 55%)" fill="hsl(199 89% 55% / 0.25)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>p95 Latency (seconds)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.throughput} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="hour" stroke="hsl(215 20% 65%)" fontSize={11} />
                  <YAxis stroke="hsl(215 20% 65%)" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={data.p95LatencyTargetSeconds} stroke="hsl(0 72% 51%)" strokeDasharray="4 4" label={latencyTargetLabel} />
                  <Line type="monotone" dataKey="p95Latency" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
