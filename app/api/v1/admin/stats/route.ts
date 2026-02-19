import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();
    const supabase = createAdminClient();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const [papers, surveys, participants, todaySurveys, reads, todayReads] = await Promise.all([
      supabase.from('papers').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('surveys').select('*', { count: 'exact', head: true }),
      supabase.from('anonymous_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('surveys').select('*', { count: 'exact', head: true }).gte('completed_at', today),
      (supabase as any).from('paper_read_progress').select('*', { count: 'exact', head: true }),
      (supabase as any).from('paper_read_progress').select('*', { count: 'exact', head: true }).gte('created_at', today),
    ]);

    return successResponse({
      total_papers: papers.count || 0,
      total_surveys: surveys.count || 0,
      total_participants: participants.count || 0,
      today_surveys: todaySurveys.count || 0,
      total_reads: reads.count || 0,
      today_reads: todayReads.count || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return internalErrorResponse('Failed to fetch statistics');
  }
}
