import { NextResponse } from 'next/server';
import { getAnalyticsData } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getAnalyticsData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
