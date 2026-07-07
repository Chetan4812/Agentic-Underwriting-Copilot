'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Plus, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ROLE_LABELS } from '@/lib/rbac';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustResetPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

const roleTone: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  SUPER_ADMIN: 'destructive',
  ADMIN: 'warning',
  OPERATIONS_LEAD: 'default',
  COMPLIANCE_OFFICER: 'default',
  SENIOR_UNDERWRITER: 'secondary',
  FRONTLINE_UNDERWRITER: 'secondary',
};

export function UsersClient({
  initialUsers,
  actorId,
  actorRole,
  assignable,
}: {
  initialUsers: UserRow[];
  actorId: string;
  actorRole: string;
  assignable: string[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: assignable[assignable.length - 1] ?? 'FRONTLINE_UNDERWRITER',
    password: '',
    mustResetPassword: true,
  });

  // Reset password state
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [resetPw, setResetPw] = useState('');

  async function refresh() {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const body = await res.json();
      setUsers(body.users);
    }
    router.refresh();
  }

  async function createUser() {
    setError(null);
    setBusy('create');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setBusy(null);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error ?? 'Failed to create user');
      return;
    }
    setCreateOpen(false);
    setForm({ name: '', email: '', role: form.role, password: '', mustResetPassword: true });
    await refresh();
  }

  async function patchUser(id: string, data: Record<string, unknown>) {
    setError(null);
    setBusy(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? 'Update failed');
      return;
    }
    await refresh();
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    setError(null);
    setBusy(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? 'Delete failed');
      return;
    }
    await refresh();
  }

  async function submitReset() {
    if (!resetFor) return;
    setError(null);
    setBusy(resetFor.id);
    const res = await fetch(`/api/admin/users/${resetFor.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPw, mustResetPassword: true }),
    });
    setBusy(null);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body?.error ?? 'Reset failed');
      return;
    }
    setResetFor(null);
    setResetPw('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} users</p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4" /> New user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {assignable.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Temporary password</Label>
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="min 8 chars, 1 letter + 1 number"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.mustResetPassword}
                  onChange={(e) => setForm({ ...form, mustResetPassword: e.target.checked })}
                />
                Require password change at first login
              </label>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button onClick={createUser} disabled={busy === 'create'}>
                {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && !createOpen && (
        <p className="rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Last login</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const canEdit =
                    assignable.length > 0 && (u.role !== 'SUPER_ADMIN' || actorRole === 'SUPER_ADMIN');
                  return (
                    <tr key={u.id} className="border-b border-border/60">
                      <td className="px-4 py-2 font-medium">
                        {u.name}
                        {u.id === actorId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-2">
                        {canEdit ? (
                          <select
                            className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                            value={u.role}
                            disabled={busy === u.id}
                            onChange={(e) => patchUser(u.id, { role: e.target.value })}
                          >
                            {Array.from(new Set([u.role, ...assignable])).map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r] ?? r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={roleTone[u.role] ?? 'secondary'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {u.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={u.isActive ? 'Disable' : 'Enable'}
                                disabled={busy === u.id || u.id === actorId}
                                onClick={() => patchUser(u.id, { isActive: !u.isActive })}
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Reset password"
                                disabled={busy === u.id}
                                onClick={() => {
                                  setResetFor(u);
                                  setResetPw('');
                                }}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete"
                                disabled={busy === u.id || u.id === actorId}
                                onClick={() => deleteUser(u.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password{resetFor ? ` — ${resetFor.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>New temporary password</Label>
              <Input type="text" value={resetPw} onChange={(e) => setResetPw(e.target.value)} />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={submitReset} disabled={busy === resetFor?.id}>
              <KeyRound className="h-4 w-4" /> Set password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
