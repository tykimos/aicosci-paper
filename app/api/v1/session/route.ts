import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { fingerprint, session_id } = body;

    const supabase = await createClient();

    // If session_id provided, try to update existing session
    if (session_id) {
      const { data: existingSession } = await supabase
        .from('anonymous_sessions')
        .select('id')
        .eq('id', session_id)
        .single();

      if (existingSession) {
        // Update last_active_at
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('anonymous_sessions')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', session_id);

        return successResponse({ session_id });
      }
    }

    // Create new session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newSession, error } = await (supabase as any)
      .from('anonymous_sessions')
      .insert({
        fingerprint: fingerprint || null,
      })
      .select('id')
      .single();

    if (error || !newSession) {
      console.error('Error creating session:', error);
      return internalErrorResponse('Failed to create session');
    }

    return successResponse(
      { session_id: newSession.id },
      undefined,
      201
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}
