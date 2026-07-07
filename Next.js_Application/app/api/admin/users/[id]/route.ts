import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, ForbiddenError, UnauthorizedError } from '@/lib/auth';
import { assignableRoles } from '@/lib/rbac';

type Params = { params: { id: string } };

// PATCH /api/admin/users/:id -> update role / active status / name
export async function PATCH(req: NextRequest, { params }: Params) {
  let actor;
  try {
    actor = await requireCapability('users.manage');
  } catch (e) {
    return errorResponse(e);
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim();

  if (typeof body?.isActive === 'boolean') {
    if (target.id === actor.id && body.isActive === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }
    data.isActive = body.isActive;
  }

  if (typeof body?.role === 'string' && body.role !== target.role) {
    if (!assignableRoles(actor.role).includes(body.role as never)) {
      return NextResponse.json({ error: `You cannot assign the role ${body.role}` }, { status: 403 });
    }
    // Only a SUPER_ADMIN may change another SUPER_ADMIN.
    if (target.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only a Super Admin can modify a Super Admin' }, { status: 403 });
    }
    data.role = body.role;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustResetPassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ user });
}

// DELETE /api/admin/users/:id -> remove a user (guards self + last super admin)
export async function DELETE(_req: NextRequest, { params }: Params) {
  let actor;
  try {
    actor = await requireCapability('users.manage');
  } catch (e) {
    return errorResponse(e);
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (target.id === actor.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }
  if (target.role === 'SUPER_ADMIN') {
    if (actor.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only a Super Admin can delete a Super Admin' }, { status: 403 });
    }
    const superAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (superAdmins <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last Super Admin' }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

function errorResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (e instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  throw e;
}
