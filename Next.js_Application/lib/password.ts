import bcrypt from 'bcryptjs';

// Password hashing helpers (Node runtime only — used in API routes + seed).
const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

// Basic password policy used by login/create/reset flows.
export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(pw)) return 'Password must contain a letter.';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number.';
  return null;
}
