import { SignJWT, jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// Edge-safe JWT helpers (jose only). Imported by middleware AND route handlers.
// Do NOT import next/headers or prisma here — keep this runtime-agnostic.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = 'uc_session';

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  [key: string]: unknown;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Fail loud in production; allow a dev fallback locally.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is missing or too short');
    }
    return new TextEncoder().encode('dev-only-insecure-secret-please-change');
  }
  return new TextEncoder().encode(secret);
}

function ttlSeconds(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? '12');
  return Math.max(1, hours) * 3600;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds())
    .setSubject(payload.id)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionMaxAgeSeconds(): number {
  return ttlSeconds();
}
