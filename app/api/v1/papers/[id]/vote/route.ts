import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
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

    // Get current vote
    const { data: vote } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('paper_id', paperId)
      .eq('session_id', sessionId)
      .single() as { data: { vote_type: string } | null };

    // Get paper vote count
    const { data: paper } = await supabase
      .from('papers')
      .select('vote_count')
      .eq('id', paperId)
      .single() as { data: { vote_count: number } | null };

    return successResponse({
      vote_count: paper?.vote_count || 0,
      user_vote: vote?.vote_type || null,
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
    const { vote_type, session_id } = body;

    if (!session_id) {
      return badRequestResponse('session_id is required');
    }

    if (!vote_type || !['up', 'down'].includes(vote_type)) {
      return badRequestResponse('vote_type must be "up" or "down"');
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

    // Upsert vote
    const { error } = await (supabase as unknown as {
      from: (table: string) => {
        upsert: (data: Record<string, unknown>, options: { onConflict: string }) => Promise<{ error: unknown }>
      }
    })
      .from('votes')
      .upsert(
        {
          paper_id: paperId,
          session_id,
          vote_type,
        },
        {
          onConflict: 'paper_id,session_id',
        }
      );

    if (error) {
      console.error('Error voting:', error);
      return internalErrorResponse('Failed to vote');
    }

    // Get updated vote count
    const { data: updatedPaper } = await supabase
      .from('papers')
      .select('vote_count')
      .eq('id', paperId)
      .single() as { data: { vote_count: number } | null };

    return successResponse({
      vote_count: updatedPaper?.vote_count || 0,
      user_vote: vote_type,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: paperId } = await params;
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return badRequestResponse('session_id is required');
    }

    const supabase = await createClient();

    const { error } = await (supabase as unknown as {
      from: (table: string) => {
        delete: () => { eq: (col: string, val: string) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } }
      }
    })
      .from('votes')
      .delete()
      .eq('paper_id', paperId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error deleting vote:', error);
      return internalErrorResponse('Failed to delete vote');
    }

    // Get updated vote count
    const { data: paper } = await supabase
      .from('papers')
      .select('vote_count')
      .eq('id', paperId)
      .single() as { data: { vote_count: number } | null };

    return successResponse({
      vote_count: paper?.vote_count || 0,
      user_vote: null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}
