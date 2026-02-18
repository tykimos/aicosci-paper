import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/v1/badges
 * Save an earned badge to the database
 */
export async function POST(request: NextRequest) {
  try {
    const { session_id, badge_id, earned_at } = await request.json();

    if (!session_id || !badge_id) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'session_id and badge_id are required' } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Upsert to avoid duplicates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('user_badges')
      .upsert(
        {
          session_id,
          badge_id,
          earned_at: earned_at || new Date().toISOString(),
        },
        { onConflict: 'session_id,badge_id' }
      );

    if (error) {
      // If table doesn't exist yet, just log and return success (graceful degradation)
      console.error('[Badges] DB save error:', error);
      return NextResponse.json({ success: true, data: { synced: false } });
    }

    return NextResponse.json({ success: true, data: { synced: true } });
  } catch (error) {
    console.error('[Badges] Request error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/badges?session_id=xxx
 * Get all badges for a session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'session_id is required' } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('user_badges')
      .select('badge_id, earned_at')
      .eq('session_id', sessionId);

    if (error) {
      console.error('[Badges] DB read error:', error);
      return NextResponse.json({ success: true, data: { badges: [] } });
    }

    return NextResponse.json({ success: true, data: { badges: data || [] } });
  } catch (error) {
    console.error('[Badges] Request error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
