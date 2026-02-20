import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, badRequestResponse, internalErrorResponse } from '@/lib/api/response';

/**
 * POST /api/v1/chat/messages
 * Save chat messages (user + assistant pair) to DB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, paper_id, messages } = body;

    if (!session_id || !messages || !Array.isArray(messages) || messages.length === 0) {
      return badRequestResponse('session_id and messages are required');
    }

    const supabase = createAdminClient();

    const records = messages.map((msg: { role: string; content: string }) => ({
      session_id,
      paper_id: paper_id || null,
      role: msg.role,
      content: msg.content,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('chat_messages')
      .insert(records);

    if (error) {
      console.error('[ChatMessages] Insert error:', error);
      return internalErrorResponse('Failed to save messages');
    }

    return successResponse({ saved: records.length });
  } catch (error) {
    console.error('[ChatMessages] Error:', error);
    return internalErrorResponse('Failed to save chat messages');
  }
}
