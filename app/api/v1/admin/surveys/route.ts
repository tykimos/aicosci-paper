import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse, parsePaginationParams, createPaginationMeta } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const supabase = createAdminClient();
    const { page, limit, offset } = parsePaginationParams(request.nextUrl.searchParams);
    const paperId = request.nextUrl.searchParams.get('paper_id');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('surveys').select('id, paper_id, session_id, responses, completed_at, papers!inner(title)', { count: 'exact' });

    if (paperId) {
      query = query.eq('paper_id', paperId);
    }

    const { data, count, error } = await query
      .order('completed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const surveys = (data || []).map((s: any) => ({
      id: s.id,
      paper_id: s.paper_id,
      paper_title: s.papers?.title || '',
      session_id: s.session_id,
      responses: s.responses,
      completed_at: s.completed_at,
    }));

    return successResponse({ surveys }, createPaginationMeta(page, limit, count || 0));
  } catch (error) {
    console.error('Error:', error);
    return internalErrorResponse('Failed to fetch surveys');
  }
}
