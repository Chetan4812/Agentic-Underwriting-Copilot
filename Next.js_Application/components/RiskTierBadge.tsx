import { Badge } from '@/components/ui/badge';
import type { RiskTier } from '@/lib/types';

const MAP: Record<string, { variant: 'success' | 'default' | 'warning' | 'destructive'; label: string }> = {
  low: { variant: 'success', label: 'Low' },
  medium: { variant: 'default', label: 'Medium' },
  high: { variant: 'warning', label: 'High' },
  very_high: { variant: 'destructive', label: 'Very High' },
};

export function RiskTierBadge({ tier }: { tier: RiskTier | string }) {
  const cfg = MAP[tier] ?? { variant: 'secondary' as const, label: tier };
  return <Badge variant={cfg.variant as any}>{cfg.label} risk</Badge>;
}
