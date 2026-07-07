import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, ForbiddenError, UnauthorizedError } from '@/lib/auth';
import { hashPassword, validatePasswordStrength } from '@/lib/password';

type Params = { params: { id: string } };

// POST /api/admin/users/:id/reset-password { password }
export async function POST(req: NextRequest, { params }: Params) {
  let actor;
  try {
    actor = await requireCapability('users.manage');
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    throw e;
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only a Super Admin can reset a Super Admin password' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password ?? '');
  const pwError = validatePasswordStrength(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash, mustResetPassword: Boolean(body?.mustResetPassword ?? false) },
  });

  return NextResponse.json({ ok: true });
}
