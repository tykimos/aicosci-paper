import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

/**
 * GET /api/v1/admin/chats
 * List chat sessions with detailed stats per session
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort') || 'last_chat';
    const sortOrder = searchParams.get('order') || 'desc';

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: messages, error } = await (supabase as any)
      .from('chat_messages')
      .select('session_id, role, content, paper_id, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by session_id and compute stats
    const sessionMap = new Map<string, {
      session_id: string;
      msgs: { role: string; content: string; created_at: string }[];
      paper_ids: Set<string>;
    }>();

    for (const msg of (messages || [])) {
      const sid = msg.session_id;
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, { session_id: sid, msgs: [], paper_ids: new Set() });
      }
      const s = sessionMap.get(sid)!;
      s.msgs.push({ role: msg.role, content: msg.content, created_at: msg.created_at });
      if (msg.paper_id) s.paper_ids.add(msg.paper_id);
    }

    // Compute per-session stats
    let sessions = Array.from(sessionMap.values()).map(s => {
      const msgs = s.msgs;
      const userMsgs = msgs.filter(m => m.role === 'user');
      const assistantMsgs = msgs.filter(m => m.role === 'assistant');

      const firstTime = new Date(msgs[0].created_at).getTime();
      const lastTime = new Date(msgs[msgs.length - 1].created_at).getTime();
      const durationSec = Math.round((lastTime - firstTime) / 1000);

      // Character counts
      const userChars = userMsgs.reduce((sum, m) => sum + m.content.length, 0);
      const assistantChars = assistantMsgs.reduce((sum, m) => sum + m.content.length, 0);

      // Token estimate (~3.5 chars per token for mixed Korean/English)
      const userTokens = Math.round(userChars / 3.5);
      const assistantTokens = Math.round(assistantChars / 3.5);

      // Response times: time between user msg → next assistant msg
      const responseTimes: number[] = [];
      for (let i = 0; i < msgs.length - 1; i++) {
        if (msgs[i].role === 'user' && msgs[i + 1].role === 'assistant') {
          const diff = new Date(msgs[i + 1].created_at).getTime() - new Date(msgs[i].created_at).getTime();
          responseTimes.push(diff / 1000);
        }
      }
      const avgResponseSec = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

      // User input intervals: time between consecutive user msgs
      const userIntervals: number[] = [];
      for (let i = 1; i < userMsgs.length; i++) {
        const diff = new Date(userMsgs[i].created_at).getTime() - new Date(userMsgs[i - 1].created_at).getTime();
        userIntervals.push(diff / 1000);
      }
      const avgUserIntervalSec = userIntervals.length > 0
        ? Math.round(userIntervals.reduce((a, b) => a + b, 0) / userIntervals.length)
        : 0;

      const firstUserMsg = userMsgs[0]?.content.substring(0, 100) || '';
      const lastUserMsg = userMsgs[userMsgs.length - 1]?.content.substring(0, 100) || '';

      return {
        session_id: s.session_id,
        turn_count: userMsgs.length,
        message_count: msgs.length,
        first_message: firstUserMsg,
        last_message: lastUserMsg,
        first_chat: msgs[0].created_at,
        last_chat: msgs[msgs.length - 1].created_at,
        paper_count: s.paper_ids.size,
        duration_sec: durationSec,
        user_chars: userChars,
        assistant_chars: assistantChars,
        total_chars: userChars + assistantChars,
        user_tokens: userTokens,
        assistant_tokens: assistantTokens,
        total_tokens: userTokens + assistantTokens,
        avg_response_sec: avgResponseSec,
        avg_user_interval_sec: avgUserIntervalSec,
      };
    });

    // Sort
    const asc = sortOrder === 'asc';
    const sortFn = (key: string) => (a: Record<string, unknown>, b: Record<string, unknown>) => {
      const va = key === 'last_chat' || key === 'first_chat'
        ? new Date(a[key] as string).getTime()
        : (a[key] as number);
      const vb = key === 'last_chat' || key === 'first_chat'
        ? new Date(b[key] as string).getTime()
        : (b[key] as number);
      return asc ? va - vb : vb - va;
    };

    const sortKeyMap: Record<string, string> = {
      turns: 'turn_count',
      messages: 'message_count',
      duration: 'duration_sec',
      tokens: 'total_tokens',
      response: 'avg_response_sec',
      interval: 'avg_user_interval_sec',
      last_chat: 'last_chat',
    };

    const key = sortKeyMap[sortBy] || 'last_chat';
    sessions.sort(sortFn(key) as (a: typeof sessions[0], b: typeof sessions[0]) => number);

    // Global summary
    const summary = {
      total_sessions: sessions.length,
      total_turns: sessions.reduce((s, x) => s + x.turn_count, 0),
      total_messages: sessions.reduce((s, x) => s + x.message_count, 0),
      total_tokens: sessions.reduce((s, x) => s + x.total_tokens, 0),
      avg_turns: sessions.length > 0 ? +(sessions.reduce((s, x) => s + x.turn_count, 0) / sessions.length).toFixed(1) : 0,
      avg_duration_sec: sessions.length > 0 ? Math.round(sessions.reduce((s, x) => s + x.duration_sec, 0) / sessions.length) : 0,
      avg_response_sec: sessions.length > 0 ? Math.round(sessions.reduce((s, x) => s + x.avg_response_sec, 0) / sessions.length) : 0,
    };

    return successResponse({ summary, sessions });
  } catch (error) {
    console.error('[AdminChats] Error:', error);
    return internalErrorResponse('Failed to fetch chat sessions');
  }
}
