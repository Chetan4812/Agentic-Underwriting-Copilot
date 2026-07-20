import {
  AssessResponse,
  ApplicationInput,
  DecisionRecord,
  ReferralPackage,
} from './types';

// ---------------------------------------------------------------------------
// Thin server-side client for the existing FastAPI AI execution service.
// This is the ONLY place the web app talks to the 9-agent pipeline.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.AI_SERVICE_BASE_URL ?? 'http://localhost:8000';
const API_KEY = process.env.AI_SERVICE_API_KEY ?? '';
const TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS ?? '45000');

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
  return headers;
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// Heuristic to discriminate a ReferralPackage from a DecisionRecord.
function isReferral(payload: any): payload is ReferralPackage {
  return (
    payload &&
    typeof payload === 'object' &&
    'reason_for_referral' in payload &&
    'escalation_flags' in payload
  );
}

/**
 * POST /assess -> runs the 9-agent pipeline and returns either a
 * DecisionRecord or a ReferralPackage. We normalise both into a
 * discriminated union so callers can branch cleanly.
 */
export async function assess(input: ApplicationInput): Promise<AssessResponse> {
  return withTimeout(async (signal) => {
    const res = await fetch(`${BASE_URL}/assess`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
      signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AiServiceError(
        `AI service /assess failed (${res.status})`,
        res.status,
        text,
      );
    }

    const payload = await res.json();
    if (isReferral(payload)) {
      return { kind: 'referral', ...(payload as ReferralPackage) };
    }
    return { kind: 'decision', ...(payload as DecisionRecord) };
  });
}

export interface IndexDocumentInput {
  clause_id?: string;
  title?: string;
  content: string;
}

/**
 * POST /admin/index-document -> hot-indexes a new policy document into the
 * Chroma policy RAG store used by the compliance agent.
 */
export async function indexDocument(
  input: IndexDocumentInput,
): Promise<{ ok: boolean; message?: string }> {
  return withTimeout(async (signal) => {
    const res = await fetch(`${BASE_URL}/admin/index-document`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input),
      signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AiServiceError(
        `AI service /admin/index-document failed (${res.status})`,
        res.status,
        text,
      );
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, message: (data as any)?.message };
  });
}

export class AiServiceError extends Error {
  status: number;
  detail: string;
  constructor(message: string, status: number, detail: string) {
    super(message);
    this.name = 'AiServiceError';
    this.status = status;
    this.detail = detail;
  }
}
