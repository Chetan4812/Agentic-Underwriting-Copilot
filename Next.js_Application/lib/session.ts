import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  SessionPayload,
  signSession,
  verifySession,
  sessionMaxAgeSeconds,
} from './jwt';

// ---------------------------------------------------------------------------
// Cookie-backed session helpers for Server Components + Route Handlers.
// (Middleware uses lib/jwt.ts directly since it cannot read next/headers.)
// ---------------------------------------------------------------------------

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): Promise<void> {
  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionMaxAgeSeconds(),
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export function destroySession(): void {
  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
}
