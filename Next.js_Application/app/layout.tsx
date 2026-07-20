import type { Metadata } from 'next';
import './globals.css';
import { AppNav } from '@/components/AppNav';
import { getCurrentUser, ROLE_LABELS } from '@/lib/auth';
import { can } from '@/lib/rbac';

export const metadata: Metadata = {
  title: 'Agentic Underwriting Copilot',
  description: 'Underwriter, compliance and operations console for the Agentic Underwriting Copilot.',
};

const NAV_CAPS: Array<{ href: string; cap: Parameters<typeof can>[1] }> = [
  { href: '/dashboard', cap: 'dashboard.view' },
  { href: '/underwriter', cap: 'applications.view' },
  { href: '/compliance', cap: 'compliance.view' },
  { href: '/operations', cap: 'operations.view' },
  { href: '/admin', cap: 'users.manage' },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const allowedHrefs = user ? NAV_CAPS.filter((n) => can(user.role, n.cap)).map((n) => n.href) : [];

  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-background">
        {user && (
          <AppNav
            userName={user.name}
            roleLabel={ROLE_LABELS[user.role] ?? user.role}
            allowedHrefs={allowedHrefs}
            canCreate={can(user.role, 'applications.create')}
          />
        )}
        <main className={user ? 'mx-auto max-w-7xl px-4 py-6' : ''}>{children}</main>
      </body>
    </html>
  );
}
