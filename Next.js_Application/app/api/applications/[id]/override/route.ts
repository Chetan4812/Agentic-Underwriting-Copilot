import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/applications/:id/override
// Standalone endpoint to log a manual override to Underwriter_Overrides.
// (The main /action route also logs overrides transactionally; this exists for
// clients that want to record an override independently.)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid application id' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.originalVerdict || !body?.overriddenVerdict || !body?.overrideReason) {
    return NextResponse.json(
      { error: 'originalVerdict, overriddenVerdict and overrideReason are required' },
      { status: 400 },
    );
  }
  if (String(body.overrideReason).trim().length < 10) {
    return NextResponse.json({ error: 'Override justification too short' }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const override = await prisma.underwriterOverride.create({
    data: {
      applicationId: id,
      userId: user.id,
      originalVerdict: body.originalVerdict,
      overriddenVerdict: body.overriddenVerdict,
      overrideReason: body.overrideReason,
    },
  });

  return NextResponse.json({ ok: true, override });
}

// GET /api/applications/:id/override -> full override history for the case.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  const overrides = await prisma.underwriterOverride.findMany({
    where: { applicationId: id },
    include: { user: true },
    orderBy: { timestamp: 'desc' },
  });
  return NextResponse.json({ overrides });
}
