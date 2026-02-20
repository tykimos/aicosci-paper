import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

/**
 * GET /api/v1/admin/chats
 * List chat sessions with turn counts, sortable
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort') || 'last_chat';
    const sortOrder = searchParams.get('order') || 'desc';

    const supabase = createAdminClient();

    // Fetch all chat messages grouped by session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: messages, error } = await (supabase as any)
      .from('chat_messages')
      .select('session_id, role, content, paper_id, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by session_id
    const sessionMap = new Map<string, {
      session_id: string;
      turn_count: number;
      message_count: number;
      first_message: string;
      last_message: string;
      first_chat: string;
      last_chat: string;
      paper_ids: Set<string>;
    }>();

    for (const msg of (messages || [])) {
      const sid = msg.session_id;
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          session_id: sid,
          turn_count: 0,
          message_count: 0,
          first_message: '',
          last_message: '',
          first_chat: msg.created_at,
          last_chat: msg.created_at,
          paper_ids: new Set(),
        });
      }
      const session = sessionMap.get(sid)!;
      session.message_count++;
      session.last_chat = msg.created_at;

      if (msg.role === 'user') {
        session.turn_count++;
        if (!session.first_message) {
          session.first_message = msg.content.substring(0, 100);
        }
        session.last_message = msg.content.substring(0, 100);
      }

      if (msg.paper_id) {
        session.paper_ids.add(msg.paper_id);
      }
    }

    // Convert to array
    let sessions = Array.from(sessionMap.values()).map(s => ({
      session_id: s.session_id,
      turn_count: s.turn_count,
      message_count: s.message_count,
      first_message: s.first_message,
      last_message: s.last_message,
      first_chat: s.first_chat,
      last_chat: s.last_chat,
      paper_count: s.paper_ids.size,
    }));

    // Sort
    const asc = sortOrder === 'asc';
    if (sortBy === 'turns') {
      sessions.sort((a, b) => asc ? a.turn_count - b.turn_count : b.turn_count - a.turn_count);
    } else if (sortBy === 'messages') {
      sessions.sort((a, b) => asc ? a.message_count - b.message_count : b.message_count - a.message_count);
    } else {
      // Default: sort by last_chat
      sessions.sort((a, b) => {
        const ta = new Date(a.last_chat).getTime();
        const tb = new Date(b.last_chat).getTime();
        return asc ? ta - tb : tb - ta;
      });
    }

    return successResponse({
      total: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error('[AdminChats] Error:', error);
    return internalErrorResponse('Failed to fetch chat sessions');
  }
}
