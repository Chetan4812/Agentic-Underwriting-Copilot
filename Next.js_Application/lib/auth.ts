import { getSession } from './session';
import { prisma } from './prisma';
import { can, type Capability } from './rbac';

export { ROLE_LABELS } from './rbac';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Returns the logged-in user from the session cookie, or null.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
  };
}

// Route-handler guard: returns the user or throws a 401-style error object.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

// Route-handler guard for a specific capability.
export async function requireCapability(cap: Capability): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, cap)) {
    throw new ForbiddenError();
  }
  return user;
}

// Optionally re-hydrate the full DB record (e.g. to check isActive live).
export async function getCurrentDbUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.user.findUnique({ where: { id: user.id } });
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor() {
    super('Forbidden');
    this.name = 'ForbiddenError';
  }
}
