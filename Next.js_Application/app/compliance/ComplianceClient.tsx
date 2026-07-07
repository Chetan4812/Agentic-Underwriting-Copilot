'use client';

import { useState, useTransition } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface CohortRow {
  cohort: string;
  approvalRate: number;
  declineRate: number;
  sample: number;
}
interface FairnessData {
  gender: CohortRow[];
  age: CohortRow[];
  approvalRateGap: number;
  gapThreshold: number;
  alert: boolean;
}

const chartMargin = { top: 8, right: 8, left: -20, bottom: 8 };
const gridStroke = 'hsl(217 33% 20%)';
const tooltipStyle = {
  background: 'hsl(222 44% 8%)',
  border: '1px solid hsl(217 33% 20%)',
  borderRadius: 8,
  fontSize: 12,
};

function pct(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

function ParityChart({ title, rows }: { title: string; rows: CohortRow[] }) {
  const data = rows.map((r) => ({
    cohort: r.cohort,
    Approval: Number((r.approvalRate * 100).toFixed(1)),
    Decline: Number((r.declineRate * 100).toFixed(1)),
  }));
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="cohort" stroke="hsl(215 20% 65%)" fontSize={11} />
              <YAxis stroke="hsl(215 20% 65%)" fontSize={11} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="Approval" fill="hsl(142 71% 45%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Decline" fill="hsl(0 72% 51%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ComplianceClient({ data }: { data: FairnessData }) {
  const [isPending, startTransition] = useTransition();
  const [clauseId, setClauseId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function publish() {
    setMsg(null);
    startTransition(async () => {
      const res = await fetch('/api/admin/index-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clauseId, title, content }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: 'Policy document indexed into the RAG store.' });
        setClauseId(''); setTitle(''); setContent('');
      } else {
        setMsg({ ok: false, text: body?.error ?? 'Failed to index document.' });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Compliance &amp; Fairness Auditor</h1>
        <p className="text-sm text-muted-foreground">Demographic parity monitoring and policy authoring.</p>
      </div>

      <div
        className={
          'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ' +
          (data.alert
            ? 'border-destructive/50 bg-destructive/10 text-destructive'
            : 'border-success/50 bg-success/10 text-success')
        }
      >
        {data.alert ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        <span>
          Approval-rate gap across gender cohorts is <strong>{pct(data.approvalRateGap)}</strong>{' '}
          (threshold {pct(data.gapThreshold)}).{' '}
          {data.alert ? 'Exceeds fairness threshold — review required.' : 'Within acceptable range.'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ParityChart title="Approval vs Decline by Gender (CODE_GENDER)" rows={data.gender} />
        <ParityChart title="Approval vs Decline by Age Bucket" rows={data.age} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            New rules are POSTed to <code>/admin/index-document</code> and hot-indexed into the
            Chroma policy RAG store used by the compliance agent.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Clause ID</Label>
              <Input placeholder="POL-DTI-006" value={clauseId} onChange={(e) => setClauseId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="Maximum DTI for secured loans" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Policy text</Label>
            <Textarea
              rows={6}
              placeholder="Write the full policy clause text here…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          {msg && (
            <p className={'text-xs ' + (msg.ok ? 'text-success' : 'text-destructive')}>
              {msg.text}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={publish} disabled={isPending || content.trim().length === 0}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Index Policy Document
            </Button>
            <Badge variant="secondary">Compliance / Admin only</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
