import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('papers')
      .select('id, title, vote_count, survey_count')
      .is('deleted_at', null)
      .order('survey_count', { ascending: false })
      .limit(20);

    if (error) throw error;
    return successResponse({ papers: data || [] });
  } catch (error) {
    console.error('Error:', error);
    return internalErrorResponse('Failed to fetch paper stats');
  }
}
