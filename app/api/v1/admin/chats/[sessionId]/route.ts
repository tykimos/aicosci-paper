import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

/**
 * GET /api/v1/admin/chats/[sessionId]
 * Get all messages for a specific chat session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const { sessionId } = await params;
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: messages, error } = await (supabase as any)
      .from('chat_messages')
      .select('id, session_id, paper_id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return successResponse({
      session_id: sessionId,
      messages: messages || [],
      total: (messages || []).length,
    });
  } catch (error) {
    console.error('[AdminChatDetail] Error:', error);
    return internalErrorResponse('Failed to fetch chat messages');
  }
}
