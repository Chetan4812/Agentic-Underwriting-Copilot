'use client';

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ShapFactor } from '@/lib/types';

interface Props {
  factors: ShapFactor[];
  baseLogOdds?: number;
}

const RISK = 'hsl(0 72% 51%)';
const SAFE = 'hsl(142 71% 45%)';

// Style/config objects are declared as consts and passed with single braces
// to keep JSX valid and easy to tweak.
const chartMargin = { top: 8, right: 48, left: 8, bottom: 8 };
const axisTick = { fill: 'hsl(215 25% 27%)', fontWeight: 500 };
const cursorStyle = { fill: 'hsl(210 40% 96.1%)' };
const tooltipStyle = {
  background: 'hsl(0 0% 100%)',
  border: '1px solid hsl(214.3 31.8% 91.4%)',
  borderRadius: 8,
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  fontSize: 12,
  color: 'hsl(222.2 84% 4.9%)',
};
const riskDot = { background: RISK };
const safeDot = { background: SAFE };
const barRadius: [number, number, number, number] = [3, 3, 3, 3];

/**
 * SHAP Waterfall Chart.
 * Renders horizontal bars mapping each feature's contribution to the default
 * log-odds. Red = increases risk, green = decreases risk. Bars are sorted by
 * absolute magnitude so the biggest drivers surface first.
 */
export function ShapWaterfall({ factors, baseLogOdds = 0 }: Props) {
  const data = [...factors]
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .map((f) => ({
      name: f.feature_name,
      value: f.shap_value,
      effect: f.effect,
      fill: f.effect === 'increase_risk' ? RISK : SAFE,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>SHAP Waterfall — contribution to default log-odds</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={chartMargin}>
              <XAxis
                type="number"
                stroke="hsl(215.4 16.3% 46.9%)"
                fontSize={11}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                stroke="hsl(215.4 16.3% 46.9%)"
                fontSize={11}
                tick={axisTick}
              />
              <ReferenceLine x={baseLogOdds} stroke="hsl(215.4 16.3% 46.9%)" strokeDasharray="3 3" />
              <Tooltip
                cursor={cursorStyle}
                contentStyle={tooltipStyle}
                formatter={(value: number, _n, item: any) => [
                  `${value > 0 ? '+' : ''}${value.toFixed(3)} log-odds`,
                  item?.payload?.effect === 'increase_risk' ? 'Increases risk' : 'Decreases risk',
                ]}
              />
              <Bar dataKey="value" radius={barRadius} barSize={16}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
                  fill="hsl(215 25% 27%)"
                  fontSize={10}
                  fontWeight={500}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={riskDot} /> Increases risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={safeDot} /> Decreases risk
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
