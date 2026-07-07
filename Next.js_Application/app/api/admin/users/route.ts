import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, ForbiddenError, UnauthorizedError } from '@/lib/auth';
import { hashPassword, validatePasswordStrength } from '@/lib/password';
import { assignableRoles } from '@/lib/rbac';

// GET /api/admin/users -> list all users (no password hashes)
export async function GET() {
  try {
    await requireCapability('users.manage');
  } catch (e) {
    return errorResponse(e);
  }
  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
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
  return NextResponse.json({ users });
}

// POST /api/admin/users -> create a new user
export async function POST(req: NextRequest) {
  let actor;
  try {
    actor = await requireCapability('users.manage');
  } catch (e) {
    return errorResponse(e);
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const role = String(body?.role ?? '');
  const password = String(body?.password ?? '');
  const mustResetPassword = Boolean(body?.mustResetPassword ?? true);

  if (!name || !email || !role || !password) {
    return NextResponse.json(
      { error: 'name, email, role and password are required' },
      { status: 400 },
    );
  }

  if (!assignableRoles(actor.role).includes(role as never)) {
    return NextResponse.json(
      { error: `You are not allowed to assign the role ${role}` },
      { status: 403 },
    );
  }

  const pwError = validatePasswordStrength(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: role as never,
      passwordHash,
      mustResetPassword,
      createdById: actor.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustResetPassword: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}

function errorResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (e instanceof ForbiddenError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  throw e;
}
