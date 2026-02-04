import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import type { SurveyQuestion } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: questions, error } = await supabase
      .from('survey_questions')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching survey questions:', error);
      return internalErrorResponse('Failed to fetch survey questions');
    }

    return successResponse({ questions: questions as SurveyQuestion[] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}
