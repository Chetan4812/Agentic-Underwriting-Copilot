import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, ForbiddenError, UnauthorizedError } from '@/lib/auth';
import { assessAndPersist } from '@/lib/assessment-runner';
import { computeAssessment } from '@/lib/mock-ai';
import type { ApplicantFile } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST /api/applications/:id/assess
// Re-runs the assessment pipeline for an existing application and persists the
// full breakdown (risk / SHAP / compliance + DecisionRecord | ReferralPackage).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireCapability('applications.adjudicate');
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    throw e;
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid application id' }, { status: 400 });
  }

  const app = await prisma.underwritingApplication.findUnique({ where: { skIdCurr: id } });
  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  // Prefer the stored applicant file; otherwise reconstruct a minimal one.
  const stored = (app.applicantFile ?? app.rawFields) as Partial<ApplicantFile> | null;
  const applicantFile: ApplicantFile = {
    sk_id_curr: id,
    age_years: Number(stored?.age_years ?? 40),
    employment_tenure_years: Number(stored?.employment_tenure_years ?? 3),
    income_total: Number(stored?.income_total ?? 60000),
    credit_amount: Number(stored?.credit_amount ?? app.loanAmount ?? 15000),
    dti_ratio: Number(stored?.dti_ratio ?? app.dtiRatio ?? 0.3),
    credit_to_income_ratio: Number(stored?.credit_to_income_ratio ?? 0.3),
    thin_file: Boolean(stored?.thin_file ?? false),
    days_employed_anomaly: Boolean(stored?.days_employed_anomaly ?? false),
    bureau: (stored?.bureau as ApplicantFile['bureau']) ?? {
      active_credits: 1,
      closed_credits: 1,
      total_debt: 0,
      overdue_debt: 0,
      max_dpd: 0,
    },
    prior_applications: (stored?.prior_applications as ApplicantFile['prior_applications']) ?? {
      prior_app_count: 0,
      approval_rate: 0.5,
      refusal_rate: 0.5,
      avg_requested_amt: 0,
      avg_granted_amt: 0,
    },
    ext_source_scores: (stored?.ext_source_scores as number[]) ?? [0.6],
    gender: String(stored?.gender ?? 'M'),
    age_group: String(stored?.age_group ?? '40-49'),
    days_employed: stored?.days_employed as number | undefined,
  };

  const result = await assessAndPersist(id, applicantFile);
  // Touch computeAssessment import usage guard (kept for potential preview use).
  void computeAssessment;

  return NextResponse.json({
    ok: true,
    kind: result.kind,
    engine: result.engine,
    outcome: result.outcome,
  });
}
