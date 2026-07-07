'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface PresetFile {
  age_years: number;
  employment_tenure_years: number;
  income_total: number;
  credit_amount: number;
  dti_ratio: number;
  credit_to_income_ratio: number;
  thin_file: boolean;
  days_employed_anomaly: boolean;
  bureau: {
    active_credits: number;
    closed_credits: number;
    total_debt: number;
    overdue_debt: number;
    max_dpd: number;
  };
  prior_applications: {
    prior_app_count: number;
    approval_rate: number;
    refusal_rate: number;
    avg_requested_amt: number;
    avg_granted_amt: number;
  };
  ext_source_scores: number[];
  gender: string;
  age_group: string;
  days_employed?: number;
}

interface Preset {
  id: string;
  label: string;
  description: string;
  expectedOutcome: string;
  file: PresetFile;
}

const AGE_GROUPS = ['18-29', '30-39', '40-49', '50-59', '60-69', '70+'];

export function NewApplicationClient({ presets }: { presets: Preset[] }) {
  const router = useRouter();
  const [presetId, setPresetId] = useState<string>(presets[0]?.id ?? '');
  const [file, setFile] = useState<PresetFile>(presets[0]?.file);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePreset = presets.find((p) => p.id === presetId);

  function applyPreset(id: string) {
    setPresetId(id);
    const p = presets.find((x) => x.id === id);
    if (p) setFile({ ...p.file });
  }

  function setField<K extends keyof PresetFile>(key: K, value: PresetFile[K]) {
    setFile((prev) => ({ ...prev, [key]: value }));
  }

  function setBureau(key: keyof PresetFile['bureau'], value: number) {
    setFile((prev) => ({ ...prev, bureau: { ...prev.bureau, [key]: value } }));
  }

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicantFile: file }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? 'Failed to create application');
      return;
    }
    router.push(`/underwriter/${body.skIdCurr}`);
    router.refresh();
  }

  if (!file) {
    return <p className="text-sm text-muted-foreground">No sample presets available.</p>;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlaskConical className="h-4 w-4 text-primary" /> Dummy applicant presets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={
                  'rounded-lg border p-3 text-left transition ' +
                  (presetId === p.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50')
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                <Badge variant="secondary" className="mt-2">
                  {p.expectedOutcome}
                </Badge>
              </button>
            ))}
          </div>
          {activePreset && (
            <p className="mt-3 text-xs text-muted-foreground">
              Loaded <span className="text-foreground">{activePreset.label}</span>. Adjust any field
              below before submitting.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Applicant details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Num label="Age (years)" value={file.age_years} onChange={(v) => setField('age_years', v)} />
          <Num
            label="Employment tenure (years)"
            value={file.employment_tenure_years}
            onChange={(v) => setField('employment_tenure_years', v)}
          />
          <Num label="Total income" value={file.income_total} onChange={(v) => setField('income_total', v)} />
          <Num label="Credit amount" value={file.credit_amount} onChange={(v) => setField('credit_amount', v)} />
          <Num label="DTI ratio (0-1)" step={0.01} value={file.dti_ratio} onChange={(v) => setField('dti_ratio', v)} />
          <Num
            label="Credit-to-income ratio"
            step={0.01}
            value={file.credit_to_income_ratio}
            onChange={(v) => setField('credit_to_income_ratio', v)}
          />
          <div className="space-y-1.5">
            <Label>Gender (CODE_GENDER)</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={file.gender}
              onChange={(e) => setField('gender', e.target.value)}
            >
              <option value="F">F</option>
              <option value="M">M</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Age group</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={file.age_group}
              onChange={(e) => setField('age_group', e.target.value)}
            >
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>External bureau scores (comma-separated)</Label>
            <Input
              value={file.ext_source_scores.join(', ')}
              onChange={(e) =>
                setField(
                  'ext_source_scores',
                  e.target.value
                    .split(',')
                    .map((s) => Number(s.trim()))
                    .filter((n) => !Number.isNaN(n)),
                )
              }
            />
          </div>
          <Num
            label="DAYS_EMPLOYED (365243 = pensioner)"
            value={file.days_employed ?? 0}
            onChange={(v) => {
              setField('days_employed', v);
              setField('days_employed_anomaly', v === 365243);
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={file.thin_file}
              onChange={(e) => setField('thin_file', e.target.checked)}
            />
            Thin file
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={file.days_employed_anomaly}
              onChange={(e) => setField('days_employed_anomaly', e.target.checked)}
            />
            Days-employed anomaly (manual income verification)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bureau summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Num label="Active credits" value={file.bureau.active_credits} onChange={(v) => setBureau('active_credits', v)} />
          <Num label="Closed credits" value={file.bureau.closed_credits} onChange={(v) => setBureau('closed_credits', v)} />
          <Num label="Total debt" value={file.bureau.total_debt} onChange={(v) => setBureau('total_debt', v)} />
          <Num label="Overdue debt" value={file.bureau.overdue_debt} onChange={(v) => setBureau('overdue_debt', v)} />
          <Num label="Max DPD" value={file.bureau.max_dpd} onChange={(v) => setBureau('max_dpd', v)} />
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit &amp; run assessment
        </Button>
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step ?? 1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
