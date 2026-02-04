import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const adminPayload = await getCurrentAdmin();

    if (!adminPayload) {
      return unauthorizedResponse('Not authenticated');
    }

    const supabase = await createClient();

    // Get total papers
    const { count: totalPapers } = await supabase
      .from('papers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Get total surveys
    const { count: totalSurveys } = await supabase
      .from('surveys')
      .select('*', { count: 'exact', head: true });

    // Get total votes
    const { count: totalVotes } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true });

    // Get total unique participants (sessions that have voted or surveyed)
    const { count: totalParticipants } = await supabase
      .from('anonymous_sessions')
      .select('*', { count: 'exact', head: true });

    return successResponse({
      total_papers: totalPapers || 0,
      total_surveys: totalSurveys || 0,
      total_votes: totalVotes || 0,
      total_participants: totalParticipants || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return internalErrorResponse('Failed to fetch statistics');
  }
}
