'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  Activity,
  LayoutList,
  Key,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginClient({ next }: { next: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? 'Login failed');
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  // Pre-fill helper
  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const DEMO_USERS = [
    {
      name: 'Super Admin',
      email: 'superadmin@halcyoncredit.com',
      pass: 'SuperAdmin123!',
      role: 'Root Control',
      icon: Key,
      color: 'border-primary/40 hover:bg-primary/10 text-primary',
    },
    {
      name: 'Priya Nair',
      email: 'priya@halcyoncredit.com',
      pass: 'Password123!',
      role: 'Underwriter',
      icon: LayoutList,
      color: 'border-success/40 hover:bg-success/10 text-success',
    },
    {
      name: 'Elena Rossi',
      email: 'elena@halcyoncredit.com',
      pass: 'Password123!',
      role: 'Compliance',
      icon: ShieldCheck,
      color: 'border-indigo-400/40 hover:bg-indigo-400/10 text-indigo-400',
    },
    {
      name: 'Maria Alvarez',
      email: 'maria@halcyoncredit.com',
      pass: 'Password123!',
      role: 'Operations',
      icon: Activity,
      color: 'border-warning/40 hover:bg-warning/10 text-warning',
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel: Visual Showpiece (hidden on mobile) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-slate-100 via-indigo-50/30 to-slate-200 p-12 text-slate-900 border-r border-border md:flex md:flex-col md:justify-between">
        {/* Glow Spheres */}
        <div className="absolute left-[-10%] top-[-10%] h-[60%] w-[60%] rounded-full bg-primary/8 blur-[110px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-success/6 blur-[110px] pointer-events-none" />

        {/* Brand header */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border shadow-sm backdrop-blur">
            <Boxes className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-none tracking-tight text-foreground">Halcyon Credit</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Underwriting Copilot</p>
          </div>
        </div>

        {/* Showcase center */}
        <div className="relative space-y-8 my-auto">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs text-primary font-semibold">
              Next-Gen Credit Intelligence
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight leading-[1.1] max-w-lg text-foreground bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">
              Empowering Underwriters with Autonomous AI Guardrails
            </h1>
            <p className="text-sm text-muted-foreground max-w-md">
              A high-precision underwriting console powered by multi-agent reasoning, Explainable ML predictions, and automated regulatory auditing.
            </p>
          </div>

          <div className="grid gap-4 max-w-md pt-2">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card/75 p-3.5 shadow-md backdrop-blur-sm hover:shadow-lg transition-all duration-200">
              <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                <LayoutList className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Autonomous Underwriter Triage</h4>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Evaluate machine learning defaults models and local SHAP influence parameters instantly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-card/75 p-3.5 shadow-md backdrop-blur-sm hover:shadow-lg transition-all duration-200">
              <div className="mt-0.5 rounded-md bg-success/15 p-1.5">
                <ShieldCheck className="h-4 w-4 text-success" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Compliance &amp; Policy Citations</h4>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Automatic clause citation matching, hard-stop compliance filters, and audit trail generation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-card/75 p-3.5 shadow-md backdrop-blur-sm hover:shadow-lg transition-all duration-200">
              <div className="mt-0.5 rounded-md bg-warning/15 p-1.5">
                <Activity className="h-4 w-4 text-warning" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">Real-Time Risk Metrics</h4>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Detailed dashboard analytics tracing approval ratios, default likelihoods, and DTI trends.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-muted-foreground flex items-center justify-between">
          <span>© 2026 Halcyon Credit Systems Inc.</span>
          <span>v1.1.0</span>
        </div>
      </div>

      {/* Right panel: Form Area */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 md:w-1/2">
        {/* Glow Spheres for mobile screen */}
        <div className="absolute right-0 top-0 h-[250px] w-[250px] rounded-full bg-primary/10 blur-[90px] md:hidden pointer-events-none" />

        <Card className="w-full max-w-[420px] border border-border/80 bg-card/40 backdrop-blur-md shadow-xl relative z-10">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 md:hidden mb-4">
              <Boxes className="h-6 w-6 text-primary" />
              <span className="font-bold text-base">Underwriting Copilot</span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Console Sign In</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Provide credentials or select a demo channel to access your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Login form */}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@halcyoncredit.com"
                    className="pl-9 h-10 border-border bg-background/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="current-password">Password</Label>
                  <a href="#" className="text-xs text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-10 border-border bg-background/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-10 font-medium" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Workspace
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Autofill Section */}
            <div className="pt-4 border-t border-border/60">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase block mb-3">
                Demo Channels (Click to Fill)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_USERS.map((user) => {
                  const Icon = user.icon;
                  return (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => handleQuickFill(user.email, user.pass)}
                      className={`flex flex-col items-start rounded-lg border bg-secondary/15 p-2 text-left transition-all duration-200 ${user.color}`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs font-semibold text-foreground truncate">{user.name}</span>
                        <Icon className="h-3 w-3 shrink-0 opacity-70" />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{user.role}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
