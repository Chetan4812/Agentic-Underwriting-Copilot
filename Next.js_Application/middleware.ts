import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';
import { can, routeCapability } from '@/lib/rbac';

// Public paths that never require a session.
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  // Not authenticated.
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated -> enforce per-route capability for page routes.
  const cap = routeCapability(pathname);
  if (cap && !can(session.role, cap)) {
    const url = req.nextUrl.clone();
    url.pathname = '/forbidden';
    return NextResponse.redirect(url);
  }

  // Admin user-management API is restricted to users.manage capability.
  if (pathname.startsWith('/api/admin/users') && !can(session.role, 'users.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
