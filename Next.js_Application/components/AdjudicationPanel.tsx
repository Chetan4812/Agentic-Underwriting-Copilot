'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AlertTriangle, Check, Loader2, ShieldAlert, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADVERSE_ACTION_CODES } from '@/lib/types';

type Verdict = 'APPROVED' | 'DECLINED' | 'ESCALATED';

interface Props {
  applicationId: number;
  recommendedVerdict: string; // e.g. recommend_approve
  recommendedConfidence: number;
  narrative: string;
}

const VERDICT_LABELS: Record<string, string> = {
  recommend_approve: 'Auto-Approve',
  recommend_decline: 'Auto-Decline',
  refer_to_senior: 'Refer to Senior',
};

function verdictToStatus(v: string): Verdict {
  if (v === 'recommend_approve') return 'APPROVED';
  if (v === 'recommend_decline') return 'DECLINED';
  return 'ESCALATED';
}

/**
 * Adjudication Panel (Column 3).
 * - Shows the AI recommended verdict.
 * - Editable explanation narrative.
 * - Mandatory adverse-action taxonomy when declining.
 * - Manual override capture -> writes to Underwriter_Overrides via the API.
 */
export function AdjudicationPanel({
  applicationId,
  recommendedVerdict,
  recommendedConfidence,
  narrative,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const recommendedStatus = verdictToStatus(recommendedVerdict);
  const [verdict, setVerdict] = useState<Verdict>(recommendedStatus);
  const [editedNarrative, setEditedNarrative] = useState(narrative);
  const [adverseCode, setAdverseCode] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');

  const isOverride = verdict !== recommendedStatus;
  const declining = verdict === 'DECLINED';

  async function submit() {
    setError(null);
    if (declining && !adverseCode) {
      setError('An adverse action reason is required to decline.');
      return;
    }
    if (isOverride && overrideReason.trim().length < 10) {
      setError('A written justification (min 10 chars) is required to overrule the AI.');
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/applications/${applicationId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict,
          editedNarrative,
          adverseActionCode: declining ? adverseCode : null,
          isOverride,
          originalVerdict: recommendedVerdict,
          overrideReason: isOverride ? overrideReason : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? 'Failed to submit decision.');
        return;
      }
      router.push('/underwriter');
      router.refresh();
    });
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Adjudication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommended verdict card */}
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Recommended Verdict</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-semibold text-primary">
              {VERDICT_LABELS[recommendedVerdict] ?? recommendedVerdict}
            </span>
            <Badge variant="default">{(recommendedConfidence * 100).toFixed(1)}% conf.</Badge>
          </div>
        </div>

        {/* Verdict selector */}
        <div className="space-y-1.5">
          <Label>Final Verdict</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              size="sm"
              variant={verdict === 'APPROVED' ? 'success' : 'outline'}
              onClick={() => setVerdict('APPROVED')}
            >
              <Check className="h-4 w-4" /> Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant={verdict === 'DECLINED' ? 'destructive' : 'outline'}
              onClick={() => setVerdict('DECLINED')}
            >
              <X className="h-4 w-4" /> Decline
            </Button>
            <Button
              type="button"
              size="sm"
              variant={verdict === 'ESCALATED' ? 'default' : 'outline'}
              onClick={() => setVerdict('ESCALATED')}
            >
              <ShieldAlert className="h-4 w-4" /> Refer
            </Button>
          </div>
        </div>

        {/* Editable narrative */}
        <div className="space-y-1.5">
          <Label>Explanation Narrative (editable)</Label>
          <Textarea
            value={editedNarrative}
            onChange={(e) => setEditedNarrative(e.target.value)}
            rows={6}
            className="text-sm"
          />
        </div>

        {/* Adverse action (mandatory on decline) */}
        {declining && (
          <div className="space-y-1.5">
            <Label>Adverse Action Reason (required)</Label>
            <Select value={adverseCode} onValueChange={setAdverseCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason mapped to policy…" />
              </SelectTrigger>
              <SelectContent>
                {ADVERSE_ACTION_CODES.map((a) => (
                  <SelectItem key={a.code} value={a.code}>
                    {a.label} — {a.policyClause}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Override justification */}
        {isOverride && (
          <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <Label className="flex items-center gap-1.5 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> Written Justification for Overrule
            </Label>
            <p className="text-xs text-muted-foreground">
              You are overriding the AI recommendation
              (&ldquo;{VERDICT_LABELS[recommendedVerdict] ?? recommendedVerdict}&rdquo;). This is
              logged to the audit trail.
            </p>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
              placeholder="Explain why you are overruling the model…"
            />
          </div>
        )}

        {error && (
          <p className="rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <Button className="w-full" onClick={submit} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Commit Decision
        </Button>
      </CardContent>
    </Card>
  );
}
