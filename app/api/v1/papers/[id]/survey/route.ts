import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
  errorResponse,
} from '@/lib/api/response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: paperId } = await params;
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return badRequestResponse('session_id is required');
    }

    const supabase = await createClient();

    // Get survey questions
    const { data: questions } = await supabase
      .from('survey_questions')
      .select('*')
      .order('order_index', { ascending: true });

    // Get user's existing survey
    const { data: survey } = await supabase
      .from('surveys')
      .select('*')
      .eq('paper_id', paperId)
      .eq('session_id', sessionId)
      .single();

    // Get paper survey count
    const { data: paper } = await supabase
      .from('papers')
      .select('survey_count')
      .eq('id', paperId)
      .single() as { data: { survey_count: number } | null };

    return successResponse({
      questions: questions || [],
      survey: survey || null,
      survey_count: paper?.survey_count || 0,
      is_completed: !!survey,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: paperId } = await params;
    const body = await request.json();
    const { session_id, responses } = body;

    if (!session_id) {
      return badRequestResponse('session_id is required');
    }

    if (!responses || !Array.isArray(responses)) {
      return badRequestResponse('responses array is required');
    }

    const supabase = await createClient();

    // Check if paper exists
    const { data: paper } = await supabase
      .from('papers')
      .select('id')
      .eq('id', paperId)
      .is('deleted_at', null)
      .single();

    if (!paper) {
      return notFoundResponse('Paper not found');
    }

    // Check if already surveyed
    const { data: existingSurvey } = await supabase
      .from('surveys')
      .select('id')
      .eq('paper_id', paperId)
      .eq('session_id', session_id)
      .single();

    if (existingSurvey) {
      return errorResponse('ALREADY_SURVEYED', 'You have already submitted a survey for this paper', 409);
    }

    // Create survey
    const { error } = await (supabase as unknown as {
      from: (table: string) => {
        insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>
      }
    })
      .from('surveys')
      .insert({
        paper_id: paperId,
        session_id,
        responses,
      });

    if (error) {
      console.error('Error creating survey:', error);
      return internalErrorResponse('Failed to submit survey');
    }

    // Get updated survey count
    const { data: updatedPaper } = await supabase
      .from('papers')
      .select('survey_count')
      .eq('id', paperId)
      .single() as { data: { survey_count: number } | null };

    return successResponse(
      {
        message: 'Survey submitted successfully',
        survey_count: updatedPaper?.survey_count || 0,
      },
      undefined,
      201
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}
