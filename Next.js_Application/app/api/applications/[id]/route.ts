import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/applications/:id -> full case profile for the adjudication workspace.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid application id' }, { status: 400 });
  }

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

  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  return NextResponse.json({ application: app });
}
