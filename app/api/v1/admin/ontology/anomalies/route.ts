import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';
import { fetchAllRows, stddev } from '@/lib/ontology/utils';

interface FlaggedSession {
  session_id: string;
  ip_address: string | null;
  details: string;
  evidence: {
    timestamps?: string[];
    paper_ids?: string[];
    values?: number[];
  };
}

interface RuleResult {
  rule_id: string;
  rule_name: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  flagged_sessions: FlaggedSession[];
  total_flagged: number;
}

interface SessionRow {
  id: string;
  fingerprint: string | null;
  ip_address: string | null;
  created_at: string;
}

interface SurveyRow {
  id: string;
  session_id: string;
  paper_id: string;
  completed_at: string;
  responses: Array<{ questionId: string; value: string }> | null;
}

interface ReadRow {
  session_id: string;
  paper_id: string;
  time_spent_seconds: number;
  read_complete: boolean;
  scroll_percentage: number;
  created_at: string;
}

interface VoteRow {
  id: string;
  session_id: string;
  paper_id: string;
  created_at: string;
}

interface PaperRow {
  id: string;
  created_at: string;
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();
    const supabase = createAdminClient();

    const [sessions, surveyRows, readRows, voteRows] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchAllRows<SessionRow>((supabase as any).from('anonymous_sessions').select('id, fingerprint, ip_address, created_at')),
      fetchAllRows<SurveyRow>(supabase.from('surveys').select('id, session_id, paper_id, completed_at, responses')),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchAllRows<ReadRow>((supabase as any).from('paper_read_progress').select('session_id, paper_id, time_spent_seconds, read_complete, scroll_percentage, created_at')),
      fetchAllRows<VoteRow>(supabase.from('votes').select('id, session_id, paper_id, created_at')),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: papers } = await (supabase as any).from('papers').select('id, created_at').is('deleted_at', null).is('hidden_at', null);
    const papersData: PaperRow[] = papers ?? [];

    // Build session lookup map: session_id -> SessionRow
    const sessionMap = new Map<string, SessionRow>();
    for (const s of sessions) {
      sessionMap.set(s.id, s);
    }

    const ruleResults: RuleResult[] = [];

    // -----------------------------------------------------------------------
    // Rule 1: RAPID_SURVEY (HIGH)
    // Session has 3+ surveys within 10 min window, OR consecutive surveys < 2 min apart
    // -----------------------------------------------------------------------
    {
      const flagged: FlaggedSession[] = [];
      const surveysBySession = new Map<string, SurveyRow[]>();
      for (const s of surveyRows) {
        if (!surveysBySession.has(s.session_id)) surveysBySession.set(s.session_id, []);
        surveysBySession.get(s.session_id)!.push(s);
      }

      for (const [sessionId, surveys] of surveysBySession.entries()) {
        if (surveys.length < 2) continue;
        const sorted = [...surveys].sort(
          (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
        );
        const timestamps = sorted.map((s) => s.completed_at);
        const sessionInfo = sessionMap.get(sessionId);
        const ip = sessionInfo?.ip_address ?? null;

        // Check: 3+ surveys within any 10-min window
        let flaggedReason: string | null = null;
        for (let i = 0; i < sorted.length - 2; i++) {
          const windowStart = new Date(sorted[i].completed_at).getTime();
          const windowEnd = windowStart + 10 * 60 * 1000;
          const inWindow = sorted.filter(
            (s) => new Date(s.completed_at).getTime() >= windowStart && new Date(s.completed_at).getTime() <= windowEnd
          );
          if (inWindow.length >= 3) {
            flaggedReason = `${inWindow.length} surveys within 10 minutes`;
            break;
          }
        }

        // Check: consecutive surveys < 2 min apart
        if (!flaggedReason) {
          for (let i = 1; i < sorted.length; i++) {
            const diff =
              new Date(sorted[i].completed_at).getTime() - new Date(sorted[i - 1].completed_at).getTime();
            if (diff < 2 * 60 * 1000) {
              flaggedReason = `Consecutive surveys ${Math.round(diff / 1000)}s apart`;
              break;
            }
          }
        }

        if (flaggedReason) {
          flagged.push({
            session_id: sessionId,
            ip_address: ip,
            details: flaggedReason,
            evidence: { timestamps },
          });
        }
      }

      ruleResults.push({
        rule_id: 'RAPID_SURVEY',
        rule_name: 'Rapid Survey Completion',
        severity: 'HIGH',
        flagged_sessions: flagged,
        total_flagged: flagged.length,
      });
    }

    // -----------------------------------------------------------------------
    // Rule 2: SPEED_READING (MEDIUM)
    // read_complete=true AND time_spent < 15 seconds
    // -----------------------------------------------------------------------
    {
      const flagged: FlaggedSession[] = [];
      const flaggedBySession = new Map<string, { paperIds: string[]; values: number[] }>();

      for (const r of readRows) {
        if (r.read_complete && r.time_spent_seconds < 15) {
          if (!flaggedBySession.has(r.session_id)) {
            flaggedBySession.set(r.session_id, { paperIds: [], values: [] });
          }
          const entry = flaggedBySession.get(r.session_id)!;
          entry.paperIds.push(r.paper_id);
          entry.values.push(r.time_spent_seconds);
        }
      }

      for (const [sessionId, data] of flaggedBySession.entries()) {
        const sessionInfo = sessionMap.get(sessionId);
        const ip = sessionInfo?.ip_address ?? null;
        flagged.push({
          session_id: sessionId,
          ip_address: ip,
          details: `${data.paperIds.length} paper(s) marked complete with < 15s read time`,
          evidence: { paper_ids: data.paperIds, values: data.values },
        });
      }

      ruleResults.push({
        rule_id: 'SPEED_READING',
        rule_name: 'Speed Reading',
        severity: 'MEDIUM',
        flagged_sessions: flagged,
        total_flagged: flagged.length,
      });
    }

    // -----------------------------------------------------------------------
    // Rule 3: IP_CLUSTER (HIGH)
    // Same IP has 5+ distinct fingerprints, OR 10+ surveys in 1 hour from same IP
    // -----------------------------------------------------------------------
    {
      const flagged: FlaggedSession[] = [];

      // Build IP -> fingerprints map and IP -> sessions map
      const ipToFingerprints = new Map<string, Set<string>>();
      const ipToSessions = new Map<string, SessionRow[]>();
      for (const s of sessions) {
        if (!s.ip_address) continue;
        if (!ipToFingerprints.has(s.ip_address)) ipToFingerprints.set(s.ip_address, new Set());
        if (s.fingerprint) ipToFingerprints.get(s.ip_address)!.add(s.fingerprint);
        if (!ipToSessions.has(s.ip_address)) ipToSessions.set(s.ip_address, []);
        ipToSessions.get(s.ip_address)!.push(s);
      }

      // Build session -> surveys map for timestamp lookup
      const surveysBySession = new Map<string, SurveyRow[]>();
      for (const s of surveyRows) {
        if (!surveysBySession.has(s.session_id)) surveysBySession.set(s.session_id, []);
        surveysBySession.get(s.session_id)!.push(s);
      }

      const flaggedSessionIds = new Set<string>();

      // Check 5+ distinct fingerprints per IP
      for (const [ip, fingerprints] of ipToFingerprints.entries()) {
        if (fingerprints.size >= 5) {
          const sessionsForIp = ipToSessions.get(ip) ?? [];
          for (const s of sessionsForIp) {
            if (!flaggedSessionIds.has(s.id)) {
              flaggedSessionIds.add(s.id);
              flagged.push({
                session_id: s.id,
                ip_address: ip,
                details: `IP has ${fingerprints.size} distinct fingerprints`,
                evidence: { values: [fingerprints.size] },
              });
            }
          }
        }
      }

      // Check 10+ surveys in 1 hour from same IP
      for (const [ip, ipSessions] of ipToSessions.entries()) {
        const sessionIds = new Set(ipSessions.map((s) => s.id));
        const surveysForIp = surveyRows
          .filter((s) => sessionIds.has(s.session_id))
          .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());

        for (let i = 0; i < surveysForIp.length; i++) {
          const windowStart = new Date(surveysForIp[i].completed_at).getTime();
          const windowEnd = windowStart + 60 * 60 * 1000;
          const inWindow = surveysForIp.filter(
            (s) =>
              new Date(s.completed_at).getTime() >= windowStart &&
              new Date(s.completed_at).getTime() <= windowEnd
          );
          if (inWindow.length >= 10) {
            const involvedSessionIds = [...new Set(inWindow.map((s) => s.session_id))];
            for (const sid of involvedSessionIds) {
              if (!flaggedSessionIds.has(sid)) {
                flaggedSessionIds.add(sid);
                const sessionInfo = sessionMap.get(sid);
                flagged.push({
                  session_id: sid,
                  ip_address: ip,
                  details: `IP submitted ${inWindow.length} surveys within 1 hour`,
                  evidence: {
                    timestamps: inWindow.map((s) => s.completed_at),
                    values: [inWindow.length],
                  },
                });
              }
            }
            break;
          }
        }
      }

      ruleResults.push({
        rule_id: 'IP_CLUSTER',
        rule_name: 'IP Address Clustering',
        severity: 'HIGH',
        flagged_sessions: flagged,
        total_flagged: flagged.length,
      });
    }

    // -----------------------------------------------------------------------
    // Rule 4: FINGERPRINT_DUPE (MEDIUM)
    // Same fingerprint has 3+ session_ids
    // -----------------------------------------------------------------------
    {
      const flagged: FlaggedSession[] = [];
      const fingerprintToSessions = new Map<string, SessionRow[]>();
      for (const s of sessions) {
        if (!s.fingerprint) continue;
        if (!fingerprintToSessions.has(s.fingerprint)) fingerprintToSessions.set(s.fingerprint, []);
        fingerprintToSessions.get(s.fingerprint)!.push(s);
      }

      for (const [fingerprint, fpSessions] of fingerprintToSessions.entries()) {
        if (fpSessions.length >= 3) {
          for (const s of fpSessions) {
            flagged.push({
              session_id: s.id,
              ip_address: s.ip_address,
              details: `Fingerprint ${fingerprint} shared by ${fpSessions.length} sessions`,
              evidence: { values: [fpSessions.length] },
            });
          }
        }
      }

      ruleResults.push({
        rule_id: 'FINGERPRINT_DUPE',
        rule_name: 'Duplicate Fingerprint',
        severity: 'MEDIUM',
        flagged_sessions: flagged,
        total_flagged: flagged.length,
      });
    }

    // -----------------------------------------------------------------------
    // Rule 5: UNIFORM_RESPONSES (MEDIUM)
    // Session's 3+ surveys all have identical q2-1, q2-3, q2-4, q2-5 values
    // -----------------------------------------------------------------------
    {
      const flagged: FlaggedSession[] = [];
      const surveysBySession = new Map<string, SurveyRow[]>();
      for (const s of surveyRows) {
        if (!surveysBySession.has(s.session_id)) surveysBySession.set(s.session_id, []);
        surveysBySession.get(s.session_id)!.push(s);
      }

      const scalarQuestions = ['q2-1', 'q2-3', 'q2-4', 'q2-5'];

      for (const [sessionId, surveys] of surveysBySession.entries()) {
        if (surveys.length < 3) continue;

        const surveysWithResponses = surveys.filter((s) => s.responses && s.responses.length > 0);
        if (surveysWithResponses.length < 3) continue;

        // Extract scalar question values for each survey
        const surveyValues = surveysWithResponses.map((s) => {
          const vals: Record<string, string | undefined> = {};
          for (const q of scalarQuestions) {
            vals[q] = s.responses?.find((r) => r.questionId === q)?.value;
          }
          return vals;
        });

        // Check if all surveys have identical values for all scalar questions
        const first = surveyValues[0];
        const allIdentical = surveyValues.every((sv) =>
          scalarQuestions.every((q) => sv[q] === first[q])
        );

        if (allIdentical) {
          const sessionInfo = sessionMap.get(sessionId);
          const ip = sessionInfo?.ip_address ?? null;
          const paperIds = surveysWithResponses.map((s) => s.paper_id);
          flagged.push({
            session_id: sessionId,
            ip_address: ip,
            details: `${surveysWithResponses.length} surveys with identical scalar responses`,
            evidence: { paper_ids: paperIds },
          });
        }
      }

      ruleResults.push({
        rule_id: 'UNIFORM_RESPONSES',
        rule_name: 'Uniform Survey Responses',
        severity: 'MEDIUM',
        flagged_sessions: flagged,
        total_flagged: flagged.length,
      });
    }

    // -----------------------------------------------------------------------
    // Rule 6: BOT_BEHAVIOR (HIGH)
    // 10+ papers with stddev(time_spent) < 5,
    // OR papers read in papers.created_at ascending order (10+ papers in exact publish order)
    // -----------------------------------------------------------------------
    {
      const flagged: FlaggedSession[] = [];
      const readsBySession = new Map<string, ReadRow[]>();
      for (const r of readRows) {
        if (!readsBySession.has(r.session_id)) readsBySession.set(r.session_id, []);
        readsBySession.get(r.session_id)!.push(r);
      }

      // Build paper created_at order map: paper_id -> created_at timestamp
      const paperCreatedAt = new Map<string, number>();
      for (const p of papersData) {
        paperCreatedAt.set(p.id, new Date(p.created_at).getTime());
      }

      // Sort papers by created_at ascending (publish order)
      const papersInOrder = [...papersData].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const paperPublishRank = new Map<string, number>();
      papersInOrder.forEach((p, i) => paperPublishRank.set(p.id, i));

      for (const [sessionId, reads] of readsBySession.entries()) {
        if (reads.length < 10) continue;

        const sessionInfo = sessionMap.get(sessionId);
        const ip = sessionInfo?.ip_address ?? null;
        let flaggedReason: string | null = null;
        let evidencePaperIds: string[] = [];
        let evidenceValues: number[] = [];

        // Check stddev of time_spent < 5
        const timeValues = reads.map((r) => r.time_spent_seconds);
        const sd = stddev(timeValues);
        if (sd < 5) {
          flaggedReason = `${reads.length} papers read with time stddev of ${sd.toFixed(2)}s (< 5s)`;
          evidencePaperIds = reads.map((r) => r.paper_id);
          evidenceValues = timeValues;
        }

        // Check if 10+ papers read in exact publish order
        if (!flaggedReason) {
          const sortedByReadTime = [...reads].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const readPaperIds = sortedByReadTime.map((r) => r.paper_id);
          const readRanks = readPaperIds.map((pid) => paperPublishRank.get(pid) ?? -1).filter((r) => r >= 0);

          if (readRanks.length >= 10) {
            // Check if ranks are strictly increasing (read in ascending publish order)
            let isInOrder = true;
            for (let i = 1; i < readRanks.length; i++) {
              if (readRanks[i] <= readRanks[i - 1]) {
                isInOrder = false;
                break;
              }
            }
            if (isInOrder) {
              flaggedReason = `${readRanks.length} papers read in exact publication order`;
              evidencePaperIds = readPaperIds;
              evidenceValues = readRanks;
            }
          }
        }

        if (flaggedReason) {
          flagged.push({
            session_id: sessionId,
            ip_address: ip,
            details: flaggedReason,
            evidence: { paper_ids: evidencePaperIds, values: evidenceValues },
          });
        }
      }

      ruleResults.push({
        rule_id: 'BOT_BEHAVIOR',
        rule_name: 'Bot-like Behavior',
        severity: 'HIGH',
        flagged_sessions: flagged,
        total_flagged: flagged.length,
      });
    }

    // -----------------------------------------------------------------------
    // Rule 7: BURST_ACTIVITY (LOW)
    // 20+ actions (reads + surveys + votes) in any 5-min window
    // -----------------------------------------------------------------------
    {
      const flagged: FlaggedSession[] = [];

      // Collect all actions per session with timestamps
      const actionsBySession = new Map<string, { time: number; type: string }[]>();

      for (const r of readRows) {
        if (!actionsBySession.has(r.session_id)) actionsBySession.set(r.session_id, []);
        actionsBySession.get(r.session_id)!.push({ time: new Date(r.created_at).getTime(), type: 'read' });
      }
      for (const s of surveyRows) {
        if (!actionsBySession.has(s.session_id)) actionsBySession.set(s.session_id, []);
        actionsBySession.get(s.session_id)!.push({ time: new Date(s.completed_at).getTime(), type: 'survey' });
      }
      for (const v of voteRows) {
        if (!actionsBySession.has(v.session_id)) actionsBySession.set(v.session_id, []);
        actionsBySession.get(v.session_id)!.push({ time: new Date(v.created_at).getTime(), type: 'vote' });
      }

      for (const [sessionId, actions] of actionsBySession.entries()) {
        if (actions.length < 20) continue;

        const sorted = [...actions].sort((a, b) => a.time - b.time);
        let maxInWindow = 0;
        let windowStart = 0;

        for (let i = 0; i < sorted.length; i++) {
          const start = sorted[i].time;
          const end = start + 5 * 60 * 1000;
          const inWindow = sorted.filter((a) => a.time >= start && a.time <= end);
          if (inWindow.length > maxInWindow) {
            maxInWindow = inWindow.length;
            windowStart = start;
          }
        }

        if (maxInWindow >= 20) {
          const sessionInfo = sessionMap.get(sessionId);
          const ip = sessionInfo?.ip_address ?? null;
          flagged.push({
            session_id: sessionId,
            ip_address: ip,
            details: `${maxInWindow} actions in a 5-minute window`,
            evidence: {
              timestamps: [new Date(windowStart).toISOString()],
              values: [maxInWindow],
            },
          });
        }
      }

      ruleResults.push({
        rule_id: 'BURST_ACTIVITY',
        rule_name: 'Burst Activity',
        severity: 'LOW',
        flagged_sessions: flagged,
        total_flagged: flagged.length,
      });
    }

    // -----------------------------------------------------------------------
    // Rule 8: VOTE_GAMING (HIGH)
    // 20+ votes in 5 min, OR same IP + different sessions voting on same paper
    // -----------------------------------------------------------------------
    {
      const flagged: FlaggedSession[] = [];
      const flaggedSessionIds = new Set<string>();

      // Check 20+ votes in 5 min per session
      const votesBySession = new Map<string, VoteRow[]>();
      for (const v of voteRows) {
        if (!votesBySession.has(v.session_id)) votesBySession.set(v.session_id, []);
        votesBySession.get(v.session_id)!.push(v);
      }

      for (const [sessionId, votes] of votesBySession.entries()) {
        if (votes.length < 20) continue;

        const sorted = [...votes].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (let i = 0; i < sorted.length; i++) {
          const windowStart = new Date(sorted[i].created_at).getTime();
          const windowEnd = windowStart + 5 * 60 * 1000;
          const inWindow = sorted.filter(
            (v) =>
              new Date(v.created_at).getTime() >= windowStart &&
              new Date(v.created_at).getTime() <= windowEnd
          );
          if (inWindow.length >= 20) {
            if (!flaggedSessionIds.has(sessionId)) {
              flaggedSessionIds.add(sessionId);
              const sessionInfo = sessionMap.get(sessionId);
              const ip = sessionInfo?.ip_address ?? null;
              flagged.push({
                session_id: sessionId,
                ip_address: ip,
                details: `${inWindow.length} votes in 5 minutes`,
                evidence: {
                  timestamps: inWindow.map((v) => v.created_at),
                  values: [inWindow.length],
                },
              });
            }
            break;
          }
        }
      }

      // Check same IP + different sessions voting on same paper
      const ipPaperToSessions = new Map<string, Set<string>>();
      for (const v of voteRows) {
        const sessionInfo = sessionMap.get(v.session_id);
        const ip = sessionInfo?.ip_address;
        if (!ip) continue;
        const key = `${ip}::${v.paper_id}`;
        if (!ipPaperToSessions.has(key)) ipPaperToSessions.set(key, new Set());
        ipPaperToSessions.get(key)!.add(v.session_id);
      }

      for (const [key, sessionIds] of ipPaperToSessions.entries()) {
        if (sessionIds.size < 2) continue;
        const [ip, paperId] = key.split('::');
        for (const sid of sessionIds) {
          if (!flaggedSessionIds.has(sid)) {
            flaggedSessionIds.add(sid);
            flagged.push({
              session_id: sid,
              ip_address: ip,
              details: `Same IP voted on paper ${paperId} from ${sessionIds.size} different sessions`,
              evidence: { paper_ids: [paperId], values: [sessionIds.size] },
            });
          }
        }
      }

      ruleResults.push({
        rule_id: 'VOTE_GAMING',
        rule_name: 'Vote Gaming',
        severity: 'HIGH',
        flagged_sessions: flagged,
        total_flagged: flagged.length,
      });
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    const allFlaggedSessionIds = new Set<string>();
    for (const rule of ruleResults) {
      for (const fs of rule.flagged_sessions) {
        allFlaggedSessionIds.add(fs.session_id);
      }
    }

    const highSeverityCount = ruleResults
      .filter((r) => r.severity === 'HIGH')
      .reduce((sum, r) => sum + r.flagged_sessions.length, 0);
    const mediumSeverityCount = ruleResults
      .filter((r) => r.severity === 'MEDIUM')
      .reduce((sum, r) => sum + r.flagged_sessions.length, 0);
    const lowSeverityCount = ruleResults
      .filter((r) => r.severity === 'LOW')
      .reduce((sum, r) => sum + r.flagged_sessions.length, 0);

    const totalSessions = sessions.length;
    const flaggedPercentage =
      totalSessions > 0 ? Math.round((allFlaggedSessionIds.size / totalSessions) * 10000) / 100 : 0;

    return successResponse({
      rules: ruleResults,
      summary: {
        total_flagged_sessions: allFlaggedSessionIds.size,
        high_severity_count: highSeverityCount,
        medium_severity_count: mediumSeverityCount,
        low_severity_count: lowSeverityCount,
        flagged_percentage: flaggedPercentage,
      },
      total_sessions: totalSessions,
    });
  } catch (error) {
    console.error('Error fetching anomaly detection:', error);
    return internalErrorResponse('Failed to fetch anomaly detection');
  }
}
