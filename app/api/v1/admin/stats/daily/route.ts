import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [surveysRes, votesRes, sessionsRes] = await Promise.all([
      (supabase as any).from('surveys').select('completed_at').gte('completed_at', sinceStr),
      (supabase as any).from('votes').select('created_at').gte('created_at', sinceStr),
      (supabase as any).from('anonymous_sessions').select('created_at').gte('created_at', sinceStr),
    ]);

    // Build date map for last N days
    const dateMap: Record<string, { surveys: number; votes: number; new_sessions: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dateMap[key] = { surveys: 0, votes: 0, new_sessions: 0 };
    }

    for (const s of (surveysRes.data || [])) {
      const key = s.completed_at?.split('T')[0];
      if (key && dateMap[key]) dateMap[key].surveys++;
    }
    for (const v of (votesRes.data || [])) {
      const key = v.created_at?.split('T')[0];
      if (key && dateMap[key]) dateMap[key].votes++;
    }
    for (const sess of (sessionsRes.data || [])) {
      const key = sess.created_at?.split('T')[0];
      if (key && dateMap[key]) dateMap[key].new_sessions++;
    }

    const daily = Object.entries(dateMap)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return successResponse({ daily });
  } catch (error) {
    console.error('Error:', error);
    return internalErrorResponse('Failed to fetch daily stats');
  }
}
