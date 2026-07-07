import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assignableRoles } from '@/lib/rbac';
import { UsersClient } from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const actor = await getCurrentUser();
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

  const serialised = users.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Create accounts, assign roles, reset passwords and manage access. Super Admin has full
          control over every module.
        </p>
      </div>
      <UsersClient
        initialUsers={serialised}
        actorId={actor?.id ?? ''}
        actorRole={actor?.role ?? ''}
        assignable={assignableRoles(actor?.role ?? '')}
      />
    </div>
  );
}
