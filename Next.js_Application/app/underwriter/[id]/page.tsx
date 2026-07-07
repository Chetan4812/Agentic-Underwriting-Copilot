import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RiskTierBadge } from '@/components/RiskTierBadge';
import { ShapWaterfall } from '@/components/ShapWaterfall';
import { CitationPanel } from '@/components/CitationPanel';
import { AdjudicationPanel } from '@/components/AdjudicationPanel';
import { DAYS_EMPLOYED_SENTINEL, formatCurrency, formatPercent } from '@/lib/utils';
import type { ShapFactor } from '@/lib/types';

export const dynamic = 'force-dynamic';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const app = await prisma.underwritingApplication.findUnique({
    where: { skIdCurr: id },
    include: {
      assessment: true,
      shapFactors: true,
      policyCitations: true,
      decisionRecord: { include: { actionedBy: true } },
      referralPackage: true,
      overrides: { include: { user: true }, orderBy: { timestamp: 'desc' } },
      assignedTo: true,
    },
  });
  if (!app) notFound();

  const file = (app.applicantFile as any) ?? {};
  const daysEmployed = file.days_employed ?? (app.rawFields as any)?.DAYS_EMPLOYED;
  const isPensioner = daysEmployed === DAYS_EMPLOYED_SENTINEL;

  const shap: ShapFactor[] = app.shapFactors.map((s) => ({
    feature_name: s.featureName,
    shap_value: s.shapValue,
    effect: s.effect as ShapFactor['effect'],
  }));

  const citations = app.policyCitations.map((c) => ({
    clauseId: c.clauseId,
    textSnippet: c.textSnippet,
    passed: c.passed,
  }));

  const rec = app.decisionRecord;
  const referral = app.referralPackage;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/underwriter"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Application #{app.skIdCurr}</h1>
            <p className="text-sm text-muted-foreground">
              {app.status} · assigned to {app.assignedTo?.name ?? 'Unassigned'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {app.assessment && <RiskTierBadge tier={app.assessment.riskTier} />}
          {app.assessment?.thinFileFlag && <Badge variant="warning">Thin-File</Badge>}
          {app.assessment?.lowConfidenceFlag && <Badge variant="warning">Low Confidence</Badge>}
          {app.assessment?.fairnessFlag && <Badge variant="destructive">Fairness</Badge>}
        </div>
      </div>

      {isPensioner && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Pensioner / Unemployed Profile</strong> — Manual Income Verification Required
            (DAYS_EMPLOYED sentinel {DAYS_EMPLOYED_SENTINEL} detected).
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Column 1: Applicant Dossier */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Applicant Dossier</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <Metric label="Age" value={file.age_years != null ? `${file.age_years} yrs` : '—'} />
              <Metric label="Annual income" value={file.income_total != null ? formatCurrency(file.income_total) : '—'} />
              <Metric label="Credit requested" value={formatCurrency(app.loanAmount)} />
              <Metric label="DTI ratio" value={formatPercent(app.dtiRatio)} />
              <Metric label="Credit / income" value={file.credit_to_income_ratio != null ? String(file.credit_to_income_ratio) : '—'} />
              <Metric label="Employment tenure" value={file.employment_tenure_years != null ? `${file.employment_tenure_years} yrs` : '—'} />
              <Metric label="Gender (CODE_GENDER)" value={file.gender ?? '—'} />
              <Metric label="Age group" value={file.age_group ?? '—'} />
            </CardContent>
          </Card>

          {file.bureau && (
            <Card>
              <CardHeader><CardTitle>Credit Bureau</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <Metric label="Active credits" value={String(file.bureau.active_credits)} />
                <Metric label="Closed credits" value={String(file.bureau.closed_credits)} />
                <Metric label="Total debt" value={formatCurrency(file.bureau.total_debt)} />
                <Metric label="Overdue debt" value={formatCurrency(file.bureau.overdue_debt)} />
                <Metric label="Max DPD" value={String(file.bureau.max_dpd)} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 2: Risk & Audits */}
        <div className="space-y-5">
          {app.assessment && (
            <Card>
              <CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <Metric label="Probability of default" value={formatPercent(app.assessment.defaultProbability)} />
                <Metric
                  label="Confidence band"
                  value={`${formatPercent(app.assessment.confidenceBandLower)} – ${formatPercent(app.assessment.confidenceBandUpper)}`}
                />
              </CardContent>
            </Card>
          )}
          <ShapWaterfall factors={shap} />
          <CitationPanel
            citations={citations}
            hardStopViolations={(referral?.partialFindings as any)?.hard_stop_violations ?? []}
          />
        </div>

        {/* Column 3: Adjudication */}
        <div className="space-y-5">
          {rec ? (
            <AdjudicationPanel
              applicationId={app.skIdCurr}
              recommendedVerdict={rec.decisionRecommendation}
              recommendedConfidence={rec.confidence}
              narrative={rec.explanationNarrative}
            />
          ) : referral ? (
            <Card>
              <CardHeader><CardTitle>Referral Package</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="text-sm">{referral.reasonForReferral}</p>
                <div className="flex flex-wrap gap-1">
                  {referral.escalationFlags.map((f) => (
                    <Badge key={f} variant="warning">{f}</Badge>
                  ))}
                </div>
                <AdjudicationPanel
                  applicationId={app.skIdCurr}
                  recommendedVerdict="refer_to_senior"
                  recommendedConfidence={0}
                  narrative={referral.reasonForReferral}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Adjudication</CardTitle></CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                No assessment yet. Run the AI pipeline to generate a recommendation.
              </CardContent>
            </Card>
          )}

          {app.overrides.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Override History</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-0">
                {app.overrides.map((o) => (
                  <div key={o.id} className="rounded-md border border-border bg-secondary/40 p-2 text-xs">
                    <p className="font-medium">
                      {o.user.name}: {o.originalVerdict} → {o.overriddenVerdict}
                    </p>
                    <p className="mt-1 text-muted-foreground">{o.overrideReason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
