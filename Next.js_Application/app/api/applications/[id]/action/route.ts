import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/applications/:id/action
// Commits a final underwriter decision. If the underwriter changed the AI's
// verdict, an Underwriter_Overrides row is written in the same transaction.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid application id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const {
    verdict, // 'APPROVED' | 'DECLINED' | 'ESCALATED'
    editedNarrative,
    adverseActionCode,
    isOverride,
    originalVerdict,
    overrideReason,
  } = body as {
    verdict: 'APPROVED' | 'DECLINED' | 'ESCALATED';
    editedNarrative?: string;
    adverseActionCode?: string | null;
    isOverride?: boolean;
    originalVerdict?: string;
    overrideReason?: string | null;
  };

  if (!['APPROVED', 'DECLINED', 'ESCALATED'].includes(verdict)) {
    return NextResponse.json({ error: 'Invalid verdict' }, { status: 400 });
  }
  if (verdict === 'DECLINED' && !adverseActionCode) {
    return NextResponse.json({ error: 'Adverse action reason required to decline' }, { status: 400 });
  }
  if (isOverride && (!overrideReason || overrideReason.trim().length < 10)) {
    return NextResponse.json({ error: 'Override justification required' }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const app = await prisma.underwritingApplication.findUnique({
    where: { skIdCurr: id },
    include: { decisionRecord: true },
  });
  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const ops: any[] = [
    prisma.underwritingApplication.update({
      where: { skIdCurr: id },
      data: { status: verdict },
    }),
  ];

  // Update or create decision record with the actioned metadata.
  if (app.decisionRecord) {
    ops.push(
      prisma.decisionRecord.update({
        where: { applicationId: id },
        data: {
          explanationNarrative: editedNarrative ?? app.decisionRecord.explanationNarrative,
          adverseActionCode: adverseActionCode ?? null,
          actionedByUserId: user.id,
          actionedAt: new Date(),
        },
      }),
    );
  } else {
    ops.push(
      prisma.decisionRecord.create({
        data: {
          applicationId: id,
          decisionRecommendation: verdict === 'APPROVED' ? 'recommend_approve' : verdict === 'DECLINED' ? 'recommend_decline' : 'refer_to_senior',
          confidence: 0,
          explanationNarrative: editedNarrative ?? '',
          topReasons: [],
          policyCitations: [],
          auditTrail: { manual_entry: true },
          finalCostUsd: 0,
          adverseActionCode: adverseActionCode ?? null,
          actionedByUserId: user.id,
          actionedAt: new Date(),
        },
      }),
    );
  }

  // Log the override to the audit table if the verdict changed.
  if (isOverride && originalVerdict) {
    ops.push(
      prisma.underwriterOverride.create({
        data: {
          applicationId: id,
          userId: user.id,
          originalVerdict,
          overriddenVerdict: verdict,
          overrideReason: overrideReason ?? '',
        },
      }),
    );
  }

  await prisma.$transaction(ops);

  return NextResponse.json({ ok: true });
}
