'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AlertTriangle, Check, Loader2, ShieldAlert, X, Eye, FileEdit } from 'lucide-react';
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

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  // 1. Escape HTML
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Parse bold text **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 3. Split by paragraphs/double newlines
  const paragraphs = html.split(/\n\s*\n/);
  const parsedParagraphs = paragraphs.map((p) => {
    const trimmed = p.trim();
    if (!trimmed) return '';

    // Check if it is a bullet list block
    if (trimmed.startsWith('- ')) {
      const items = trimmed.split(/\n-\s+/).map(item => {
        let cleanItem = item.replace(/^- /, '').trim();
        return `<li class="my-1 list-disc ml-5 text-slate-700 font-medium">${cleanItem}</li>`;
      });
      return `<ul class="my-2 space-y-1">${items.join('')}</ul>`;
    }

    // Check if it is a title/header line (bold line alone)
    if (trimmed.startsWith('<strong>') && trimmed.endsWith('</strong>') && !trimmed.includes('\n')) {
      return `<h4 class="text-sm font-bold text-slate-900 mt-4 mb-1.5 border-b border-slate-200/50 pb-1">${trimmed}</h4>`;
    }

    const textWithBreaks = trimmed.replace(/\n/g, '<br />');
    return `<p class="my-2 leading-relaxed text-slate-700 font-medium">${textWithBreaks}</p>`;
  });

  return parsedParagraphs.join('');
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
  const [tabMode, setTabMode] = useState<'write' | 'preview'>('preview');

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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
      {/* Left Column (2/3 width): Large Explanation Narrative Editor with Write/Preview tabs */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Explanation Narrative</CardTitle>
            <p className="text-xs text-muted-foreground">
              Provide a comprehensive formal assessment of the applicant's profile, including models, policy citations, and risk offsets.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-secondary/80 border border-border/80 p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setTabMode('write')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                tabMode === 'write'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileEdit className="h-3.5 w-3.5" /> Write
            </button>
            <button
              type="button"
              onClick={() => setTabMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                tabMode === 'preview'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tabMode === 'write' ? (
            <Textarea
              value={editedNarrative}
              onChange={(e) => setEditedNarrative(e.target.value)}
              rows={14}
              className="text-sm leading-relaxed p-4 font-mono border-border bg-background/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50 rounded-lg resize-y scrollbar-thin"
              placeholder="Write underwriting assessment details using markdown..."
            />
          ) : (
            <div
              className="prose prose-slate max-w-none text-xs leading-relaxed p-5 border border-border bg-slate-50/50 rounded-lg min-h-[310px] max-h-[480px] shadow-inner overflow-y-auto scrollbar-thin"
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(editedNarrative) }}
            />
          )}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
            <h5 className="font-semibold text-primary flex items-center gap-1.5">
              💡 Underwriting Explanation Guidelines
            </h5>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground font-medium">
              <li>Reference specific policy clauses (e.g. <code>POL-DTI-001</code>, <code>POL-EMP-002</code>) to justify approvals/denials.</li>
              <li>Include exact applicant parameters like DTI ratio, employment tenure, and default probabilities.</li>
              <li>If you are overruling the AI, clearly detail the offsetting factors (such as collateral or verified liquid assets) in the narrative.</li>
              <li>Underwriters and compliance officers must be able to audit this explanation directly.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Right Column (1/3 width): Verdict & Submit Controls */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Review &amp; Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recommended verdict card */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
            <p className="text-xs uppercase tracking-wide font-semibold text-primary/80">AI Recommended Verdict</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-base font-bold text-primary">
                {VERDICT_LABELS[recommendedVerdict] ?? recommendedVerdict}
              </span>
              <Badge variant="default" className="text-[10px] bg-primary/20 hover:bg-primary/20 text-primary font-bold border border-primary/20">
                {(recommendedConfidence * 100).toFixed(1)}% conf.
              </Badge>
            </div>
          </div>

          {/* Verdict selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Final Verdict</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={verdict === 'APPROVED' ? 'success' : 'outline'}
                onClick={() => setVerdict('APPROVED')}
                className="text-xs py-1 h-9"
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant={verdict === 'DECLINED' ? 'destructive' : 'outline'}
                onClick={() => setVerdict('DECLINED')}
                className="text-xs py-1 h-9"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Decline
              </Button>
              <Button
                type="button"
                size="sm"
                variant={verdict === 'ESCALATED' ? 'default' : 'outline'}
                onClick={() => setVerdict('ESCALATED')}
                className="text-xs py-1 h-9"
              >
                <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Refer
              </Button>
            </div>
          </div>

          {/* Adverse action (mandatory on decline) */}
          {declining && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Adverse Action Reason (required)</Label>
              <Select value={adverseCode} onValueChange={setAdverseCode}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select a reason mapped to policy…" />
                </SelectTrigger>
                <SelectContent>
                  {ADVERSE_ACTION_CODES.map((a) => (
                    <SelectItem key={a.code} value={a.code} className="text-xs">
                      {a.label} — {a.policyClause}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Override justification */}
          {isOverride && (
            <div className="space-y-1.5 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <Label className="flex items-center gap-1.5 text-warning text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" /> Written Justification
              </Label>
              <p className="text-[11px] text-muted-foreground leading-normal">
                You are overriding the AI recommendation
                (&ldquo;{VERDICT_LABELS[recommendedVerdict] ?? recommendedVerdict}&rdquo;).
              </p>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className="text-xs border-warning/30 focus-visible:ring-warning"
                placeholder="Explain why you are overruling the model…"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button className="w-full h-10 text-xs font-semibold" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Commit Final Decision
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
