import { NextResponse } from 'next/server';
import { getFairnessData } from '@/lib/compliance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getFairnessData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
