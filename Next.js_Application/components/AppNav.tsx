'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutList, ShieldCheck, Activity, Boxes, Users, Plus, LogOut, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, cap: 'dashboard.view' },
  { href: '/underwriter', label: 'Underwriter', icon: LayoutList, cap: 'applications.view' },
  { href: '/compliance', label: 'Compliance', icon: ShieldCheck, cap: 'compliance.view' },
  { href: '/operations', label: 'Operations', icon: Activity, cap: 'operations.view' },
  { href: '/admin', label: 'Users', icon: Users, cap: 'users.manage' },
];

export function AppNav({
  userName,
  roleLabel,
  allowedHrefs,
  canCreate,
}: {
  userName: string;
  roleLabel: string;
  allowedHrefs: string[];
  canCreate: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/underwriter" className="flex items-center gap-2 font-semibold">
            <Boxes className="h-5 w-5 text-primary" />
            <span>Underwriting Copilot</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.filter((item) => allowedHrefs.includes(item.href)).map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                    active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <Button asChild size="sm" variant="outline">
              <Link href="/underwriter/new">
                <Plus className="h-4 w-4" /> New application
              </Link>
            </Button>
          )}
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">{userName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={logout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
