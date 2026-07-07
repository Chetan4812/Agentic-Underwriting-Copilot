import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST /api/applications/:id/assign -> "Assign to Me".
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid application id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  let userId: string | undefined = body?.userId;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    userId = user.id;
  }

  const updated = await prisma.underwritingApplication.update({
    where: { skIdCurr: id },
    data: { assignedToUserId: userId },
  });

  return NextResponse.json({ ok: true, application: updated });
}
