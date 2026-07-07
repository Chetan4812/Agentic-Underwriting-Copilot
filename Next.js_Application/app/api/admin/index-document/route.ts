import { NextRequest, NextResponse } from 'next/server';
import { indexDocument, AiServiceError } from '@/lib/ai-service';
import { getCurrentUser } from '@/lib/auth';

// POST /api/admin/index-document
// Proxies a new policy document to the FastAPI service for hot-indexing into
// the Chroma policy RAG store. Restricted to compliance/admin roles.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const allowed = ['COMPLIANCE_OFFICER', 'ADMIN', 'SUPER_ADMIN'];
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden: compliance role required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.content || String(body.content).trim().length === 0) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  try {
    const result = await indexDocument({
      clause_id: body.clauseId,
      title: body.title,
      content: body.content,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiServiceError) {
      return NextResponse.json({ error: err.message, detail: err.detail }, { status: 502 });
    }
    return NextResponse.json({ error: 'Unexpected error contacting AI service' }, { status: 500 });
  }
}
