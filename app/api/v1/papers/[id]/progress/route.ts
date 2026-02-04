import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ProgressRequest {
  sessionId: string;
  scrollPercentage: number;
  readComplete: boolean;
  timeSpentSeconds: number;
}

interface ProgressRecord {
  id: string;
  session_id: string;
  paper_id: string;
  scroll_percentage: number;
  read_complete: boolean;
  time_spent_seconds: number;
  created_at: string;
  updated_at: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paperId } = await params;
    const body: ProgressRequest = await request.json();
    const { sessionId, scrollPercentage, readComplete, timeSpentSeconds } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Upsert reading progress using rpc or raw query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('paper_read_progress')
      .upsert(
        {
          session_id: sessionId,
          paper_id: paperId,
          scroll_percentage: scrollPercentage,
          read_complete: readComplete,
          time_spent_seconds: timeSpentSeconds,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,paper_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving progress:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save progress' },
        { status: 500 }
      );
    }

    const record = data as ProgressRecord;

    return NextResponse.json({
      success: true,
      data: {
        scrollPercentage: record.scroll_percentage,
        readComplete: record.read_complete,
        timeSpentSeconds: record.time_spent_seconds,
      },
    });
  } catch (error) {
    console.error('Error in progress API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paperId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('paper_read_progress')
      .select('*')
      .eq('session_id', sessionId)
      .eq('paper_id', paperId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      console.error('Error fetching progress:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    const record = data as ProgressRecord | null;

    return NextResponse.json({
      success: true,
      data: record
        ? {
            scrollPercentage: record.scroll_percentage,
            readComplete: record.read_complete,
            timeSpentSeconds: record.time_spent_seconds,
          }
        : {
            scrollPercentage: 0,
            readComplete: false,
            timeSpentSeconds: 0,
          },
    });
  } catch (error) {
    console.error('Error in progress API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
