import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('paper_read_progress')
      .select('paper_id');

    if (error) throw error;

    // Count reads per paper
    const counts: Record<string, number> = {};
    for (const row of (data || [])) {
      counts[row.paper_id] = (counts[row.paper_id] || 0) + 1;
    }

    return successResponse({ counts });
  } catch (error) {
    console.error('Error fetching read stats:', error);
    return internalErrorResponse('Failed to fetch read stats');
  }
}
