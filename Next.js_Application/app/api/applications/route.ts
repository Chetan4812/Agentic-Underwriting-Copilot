import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, ForbiddenError, UnauthorizedError } from '@/lib/auth';
import { assessAndPersist } from '@/lib/assessment-runner';
import { getPreset } from '@/lib/sample-applicants';
import type { ApplicantFile } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/applications?status=PENDING|ESCALATED|COMPLETED
// Returns queue rows enriched with assessment + referral flags.
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');

  let where: any = {};
  if (status === 'PENDING') where = { status: 'PENDING' };
  else if (status === 'ESCALATED') where = { status: 'ESCALATED' };
  else if (status === 'COMPLETED') where = { status: { in: ['APPROVED', 'DECLINED'] } };

  const apps = await prisma.underwritingApplication.findMany({
    where,
    orderBy: { submissionDate: 'desc' },
    include: {
      assessment: true,
      referralPackage: true,
      decisionRecord: true,
      assignedTo: true,
    },
  });

  const rows = apps.map((a) => ({
    skIdCurr: a.skIdCurr,
    status: a.status,
    loanAmount: a.loanAmount,
    dtiRatio: a.dtiRatio,
    submissionDate: a.submissionDate.toISOString(),
    riskTier: a.assessment?.riskTier ?? null,
    pd: a.assessment?.defaultProbability ?? null,
    assignedToName: a.assignedTo?.name ?? null,
    escalationFlags: a.referralPackage?.escalationFlags ?? [],
    verdict: a.decisionRecord?.decisionRecommendation ?? null,
  }));

  return NextResponse.json({ rows });
}

// POST /api/applications
// Intake: create a new application from a full applicant file (or a named
// sample preset), persist it, then run the assessment pipeline end-to-end.
// Body: { presetId?: string, applicantFile?: ApplicantFile, skIdCurr?: number }
export async function POST(req: NextRequest) {
  try {
    await requireCapability('applications.create');
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    throw e;
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  // Resolve the applicant file: preset or explicit payload.
  let baseFile: Omit<ApplicantFile, 'sk_id_curr'> | null = null;
  if (body.presetId) {
    const preset = getPreset(String(body.presetId));
    if (!preset) return NextResponse.json({ error: 'Unknown preset' }, { status: 400 });
    baseFile = preset.file;
  }
  if (body.applicantFile) {
    baseFile = { ...(baseFile ?? {}), ...body.applicantFile } as Omit<ApplicantFile, 'sk_id_curr'>;
  }
  if (!baseFile) {
    return NextResponse.json({ error: 'Provide presetId or applicantFile' }, { status: 400 });
  }

  // Derive convenience ratios if not supplied.
  const income = Number(baseFile.income_total) || 0;
  const credit = Number(baseFile.credit_amount) || 0;
  if (baseFile.credit_to_income_ratio == null && income > 0) {
    baseFile.credit_to_income_ratio = Number((credit / income).toFixed(3));
  }

  // Assign a new sk_id_curr (max existing + 1, floor 100000).
  let skIdCurr = Number(body.skIdCurr);
  if (!skIdCurr || Number.isNaN(skIdCurr)) {
    const max = await prisma.underwritingApplication.aggregate({ _max: { skIdCurr: true } });
    skIdCurr = Math.max(100000, (max._max.skIdCurr ?? 100000) + 1);
  } else {
    const existing = await prisma.underwritingApplication.findUnique({ where: { skIdCurr } });
    if (existing) return NextResponse.json({ error: `Application ${skIdCurr} already exists` }, { status: 409 });
  }

  const applicantFile: ApplicantFile = { ...baseFile, sk_id_curr: skIdCurr } as ApplicantFile;

  await prisma.underwritingApplication.create({
    data: {
      skIdCurr,
      status: 'PENDING',
      loanAmount: credit,
      dtiRatio: Number(baseFile.dti_ratio) || 0,
      rawFields: applicantFile as unknown as object,
      applicantFile: applicantFile as unknown as object,
    },
  });

  const result = await assessAndPersist(skIdCurr, applicantFile);

  return NextResponse.json(
    {
      ok: true,
      skIdCurr,
      kind: result.kind,
      engine: result.engine,
      riskTier: result.riskTier,
      pd: result.pd,
    },
    { status: 201 },
  );
}
