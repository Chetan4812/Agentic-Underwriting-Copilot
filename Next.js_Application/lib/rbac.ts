// ---------------------------------------------------------------------------
// Role-based access control.
// SUPER_ADMIN sits at the top and implicitly has every permission.
// ---------------------------------------------------------------------------

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'OPERATIONS_LEAD'
  | 'COMPLIANCE_OFFICER'
  | 'SENIOR_UNDERWRITER'
  | 'FRONTLINE_UNDERWRITER';

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OPERATIONS_LEAD: 'Operations Lead',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  SENIOR_UNDERWRITER: 'Senior Underwriter',
  FRONTLINE_UNDERWRITER: 'Frontline Underwriter',
};

export const ALL_ROLES: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'OPERATIONS_LEAD',
  'COMPLIANCE_OFFICER',
  'SENIOR_UNDERWRITER',
  'FRONTLINE_UNDERWRITER',
];

// Roles an admin/super-admin is allowed to assign when creating users.
// Only a SUPER_ADMIN may create another SUPER_ADMIN or ADMIN.
export function assignableRoles(actorRole: string): Role[] {
  if (actorRole === 'SUPER_ADMIN') return ALL_ROLES;
  if (actorRole === 'ADMIN') {
    return ['OPERATIONS_LEAD', 'COMPLIANCE_OFFICER', 'SENIOR_UNDERWRITER', 'FRONTLINE_UNDERWRITER'];
  }
  return [];
}

// Capability keys used across the app.
export type Capability =
  | 'users.manage'
  | 'applications.view'
  | 'applications.create'
  | 'applications.adjudicate'
  | 'compliance.view'
  | 'compliance.index_policy'
  | 'operations.view'
  | 'dashboard.view';

const MATRIX: Record<Role, Capability[]> = {
  SUPER_ADMIN: [
    'users.manage',
    'applications.view',
    'applications.create',
    'applications.adjudicate',
    'compliance.view',
    'compliance.index_policy',
    'operations.view',
    'dashboard.view',
  ],
  ADMIN: [
    'users.manage',
    'applications.view',
    'applications.create',
    'applications.adjudicate',
    'compliance.view',
    'compliance.index_policy',
    'operations.view',
    'dashboard.view',
  ],
  OPERATIONS_LEAD: ['applications.view', 'applications.create', 'operations.view', 'dashboard.view'],
  COMPLIANCE_OFFICER: ['applications.view', 'compliance.view', 'compliance.index_policy', 'dashboard.view'],
  SENIOR_UNDERWRITER: [
    'applications.view',
    'applications.create',
    'applications.adjudicate',
    'operations.view',
    'dashboard.view',
  ],
  FRONTLINE_UNDERWRITER: ['applications.view', 'applications.create', 'applications.adjudicate', 'dashboard.view'],
};

export function can(role: string | undefined, cap: Capability): boolean {
  if (!role) return false;
  if (role === 'SUPER_ADMIN') return true;
  const caps = MATRIX[role as Role];
  return !!caps && caps.includes(cap);
}

// Map a top-level route prefix to the capability required to view it.
export function routeCapability(pathname: string): Capability | null {
  if (pathname.startsWith('/admin')) return 'users.manage';
  if (pathname.startsWith('/compliance')) return 'compliance.view';
  if (pathname.startsWith('/operations')) return 'operations.view';
  if (pathname.startsWith('/underwriter')) return 'applications.view';
  if (pathname.startsWith('/dashboard')) return 'dashboard.view';
  return null;
}
