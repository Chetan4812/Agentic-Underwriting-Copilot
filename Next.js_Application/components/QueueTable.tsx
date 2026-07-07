'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RiskTierBadge } from '@/components/RiskTierBadge';
import { ESCALATION_TAGS } from '@/lib/types';
import { formatCurrency, formatPercent, relativeTime } from '@/lib/utils';

export interface QueueRow {
  skIdCurr: number;
  status: string;
  loanAmount: number;
  dtiRatio: number;
  submissionDate: string;
  riskTier?: string | null;
  pd?: number | null;
  assignedToName?: string | null;
  escalationFlags?: string[];
  verdict?: string | null;
}

interface Props {
  rows: QueueRow[];
  showFlags?: boolean;
  currentUserId: string;
}

export function QueueTable({ rows, showFlags = false, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<string>('all');

  const filtered = rows.filter((r) => {
    const matchesQuery = query === '' || String(r.skIdCurr).includes(query.trim());
    const matchesTier = tier === 'all' || r.riskTier === tier;
    return matchesQuery && matchesTier;
  });

  function assignToMe(id: number) {
    startTransition(async () => {
      await fetch(`/api/applications/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by application ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Risk tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk tiers</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="very_high">Very High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">PD</th>
                  <th className="px-4 py-3">Loan</th>
                  <th className="px-4 py-3">DTI</th>
                  {showFlags && <th className="px-4 py-3">Flags</th>}
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No applications match your filters.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.skIdCurr} className="border-b border-border/60 hover:bg-secondary/40">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/underwriter/${r.skIdCurr}`} className="hover:text-primary">
                        #{r.skIdCurr}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {r.riskTier ? <RiskTierBadge tier={r.riskTier} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">{r.pd != null ? formatPercent(r.pd) : '—'}</td>
                    <td className="px-4 py-3">{formatCurrency(r.loanAmount)}</td>
                    <td className="px-4 py-3">{formatPercent(r.dtiRatio)}</td>
                    {showFlags && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(r.escalationFlags ?? []).map((f) => {
                            const tag = ESCALATION_TAGS[f];
                            return (
                              <Badge key={f} variant="warning" title={tag?.label ?? f}>
                                {tag?.short ?? f}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.assignedToName ?? <span className="italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{relativeTime(r.submissionDate)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.assignedToName ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/underwriter/${r.skIdCurr}`}>Open</Link>
                        </Button>
                      ) : (
                        <Button size="sm" disabled={isPending} onClick={() => assignToMe(r.skIdCurr)}>
                          Assign to Me
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
