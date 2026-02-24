import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';
import { fetchAllRows } from '@/lib/ontology/utils';

interface ReadRow {
  session_id: string;
  paper_id: string;
  created_at: string;
}

interface SurveyRow {
  session_id: string;
}

interface PaperRow {
  id: string;
  title: string;
  tags: string[] | null;
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();
    const supabase = createAdminClient();

    // Fetch all read progress rows (session_id, paper_id, created_at)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reads = (await fetchAllRows(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('paper_read_progress').select('session_id, paper_id, created_at')
    )) as ReadRow[];

    // Fetch papers
    const { data: papersRaw } = await supabase
      .from('papers')
      .select('id, title, tags')
      .is('deleted_at', null)
      .is('hidden_at' as string, null);

    // Fetch surveys
    const surveys = (await fetchAllRows(
      supabase.from('surveys').select('session_id')
    )) as SurveyRow[];

    // Fetch total session count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: totalSessions } = await (supabase as any)
      .from('anonymous_sessions')
      .select('*', { count: 'exact', head: true });

    const paperList = (papersRaw ?? []) as PaperRow[];

    // Build lookup maps
    const paperById = new Map<string, PaperRow>();
    for (const p of paperList) {
      paperById.set(p.id, p);
    }

    // Group reads by session, sorted by created_at
    const readsBySession = new Map<string, ReadRow[]>();
    for (const row of reads) {
      if (!readsBySession.has(row.session_id)) {
        readsBySession.set(row.session_id, []);
      }
      readsBySession.get(row.session_id)!.push(row);
    }
    for (const rows of readsBySession.values()) {
      rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
    }

    // Survey sessions set
    const surveySessionIds = new Set<string>(surveys.map((s) => s.session_id));

    // -------------------------------------------------------------------------
    // A. Paper Transition Matrix
    // -------------------------------------------------------------------------
    const transitionCounts = new Map<string, number>();

    for (const rows of readsBySession.values()) {
      for (let i = 0; i < rows.length - 1; i++) {
        const fromId = rows[i].paper_id;
        const toId = rows[i + 1].paper_id;
        if (fromId === toId) continue;
        const key = `${fromId}|||${toId}`;
        transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
      }
    }

    const transitions = Array.from(transitionCounts.entries())
      .map(([key, count]) => {
        const [fromId, toId] = key.split('|||');
        const fromPaper = paperById.get(fromId);
        const toPaper = paperById.get(toId);
        return {
          from_paper: { id: fromId, title: fromPaper?.title ?? fromId },
          to_paper: { id: toId, title: toPaper?.title ?? toId },
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // -------------------------------------------------------------------------
    // B. Gateway Papers
    // -------------------------------------------------------------------------
    const gatewayCount = new Map<string, number>();
    const gatewaySessionIds = new Map<string, string[]>(); // paperId -> sessionIds

    for (const [sessionId, rows] of readsBySession.entries()) {
      if (rows.length === 0) continue;
      const firstPaperId = rows[0].paper_id;
      gatewayCount.set(firstPaperId, (gatewayCount.get(firstPaperId) ?? 0) + 1);
      if (!gatewaySessionIds.has(firstPaperId)) {
        gatewaySessionIds.set(firstPaperId, []);
      }
      gatewaySessionIds.get(firstPaperId)!.push(sessionId);
    }

    const totalSessionsNum = totalSessions ?? 0;

    const gateway_papers = Array.from(gatewayCount.entries())
      .map(([paperId, count]) => {
        const paper = paperById.get(paperId);
        const sessions = gatewaySessionIds.get(paperId) ?? [];
        const surveyConversions = sessions.filter((sid) => surveySessionIds.has(sid)).length;
        const continuations = sessions.filter((sid) => {
          const rows = readsBySession.get(sid);
          if (!rows) return false;
          const distinctPapers = new Set(rows.map((r) => r.paper_id));
          return distinctPapers.size >= 2;
        }).length;
        return {
          paper: { id: paperId, title: paper?.title ?? paperId },
          first_read_count: count,
          first_read_percentage: totalSessionsNum > 0 ? count / totalSessionsNum : 0,
          survey_conversion_rate: count > 0 ? surveyConversions / count : 0,
          continuation_rate: count > 0 ? continuations / count : 0,
        };
      })
      .sort((a, b) => b.first_read_count - a.first_read_count);

    // -------------------------------------------------------------------------
    // C. Tag Transitions
    // -------------------------------------------------------------------------
    const tagTransitionCounts = new Map<string, number>();

    for (const rows of readsBySession.values()) {
      for (let i = 0; i < rows.length - 1; i++) {
        const fromPaper = paperById.get(rows[i].paper_id);
        const toPaper = paperById.get(rows[i + 1].paper_id);
        if (!fromPaper || !toPaper) continue;
        if (rows[i].paper_id === rows[i + 1].paper_id) continue;

        const fromTags = fromPaper.tags ?? [];
        const toTags = toPaper.tags ?? [];

        for (const fromTag of fromTags) {
          for (const toTag of toTags) {
            const key = `${fromTag}|||${toTag}`;
            tagTransitionCounts.set(key, (tagTransitionCounts.get(key) ?? 0) + 1);
          }
        }
      }
    }

    const tag_transitions = Array.from(tagTransitionCounts.entries())
      .map(([key, count]) => {
        const [from_tag, to_tag] = key.split('|||');
        return { from_tag, to_tag, count };
      })
      .sort((a, b) => b.count - a.count);

    // -------------------------------------------------------------------------
    // D. Conversion Funnel
    // -------------------------------------------------------------------------
    const sessionsWithAnyRead = readsBySession.size;

    let sessionsWithTwoPlusReads = 0;
    for (const rows of readsBySession.values()) {
      const distinctPapers = new Set(rows.map((r) => r.paper_id));
      if (distinctPapers.size >= 2) {
        sessionsWithTwoPlusReads++;
      }
    }

    const sessionsWithSurvey = surveySessionIds.size;

    const funnelSteps = [
      { step: 'Total sessions', count: totalSessionsNum },
      { step: 'Sessions with at least 1 read', count: sessionsWithAnyRead },
      { step: 'Sessions with 2+ distinct papers read', count: sessionsWithTwoPlusReads },
      { step: 'Sessions with survey completed', count: sessionsWithSurvey },
    ];

    const funnel = funnelSteps.map((s, idx) => {
      const percentage = totalSessionsNum > 0 ? s.count / totalSessionsNum : 0;
      const prevCount = idx === 0 ? totalSessionsNum : funnelSteps[idx - 1].count;
      const drop_off_rate = prevCount > 0 ? 1 - s.count / prevCount : 0;
      return { step: s.step, count: s.count, percentage, drop_off_rate };
    });

    // -------------------------------------------------------------------------
    // E. Frequent Sequences
    // -------------------------------------------------------------------------
    const twoPaperCounts = new Map<string, number>();
    const threePaperCounts = new Map<string, number>();

    for (const rows of readsBySession.values()) {
      // Deduplicate consecutive same-paper reads
      const seq: string[] = [];
      for (const row of rows) {
        if (seq.length === 0 || seq[seq.length - 1] !== row.paper_id) {
          seq.push(row.paper_id);
        }
      }

      for (let i = 0; i < seq.length - 1; i++) {
        const key = `${seq[i]}|||${seq[i + 1]}`;
        twoPaperCounts.set(key, (twoPaperCounts.get(key) ?? 0) + 1);
      }

      for (let i = 0; i < seq.length - 2; i++) {
        const key = `${seq[i]}|||${seq[i + 1]}|||${seq[i + 2]}`;
        threePaperCounts.set(key, (threePaperCounts.get(key) ?? 0) + 1);
      }
    }

    const two_paper = Array.from(twoPaperCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const ids = key.split('|||');
        return {
          papers: ids,
          titles: ids.map((id) => paperById.get(id)?.title ?? id),
          count,
        };
      });

    const three_paper = Array.from(threePaperCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const ids = key.split('|||');
        return {
          papers: ids,
          titles: ids.map((id) => paperById.get(id)?.title ?? id),
          count,
        };
      });

    const result = {
      transitions,
      gateway_papers,
      tag_transitions,
      funnel,
      frequent_sequences: {
        two_paper,
        three_paper,
      },
    };

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching flow analysis:', error);
    return internalErrorResponse('Failed to fetch flow analysis');
  }
}
