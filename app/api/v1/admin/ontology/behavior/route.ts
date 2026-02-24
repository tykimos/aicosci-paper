import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';
import { fetchAllRows, getSurveyNumericValue, getResponseValue } from '@/lib/ontology/utils';

type ClusterName =
  | 'power_user'
  | 'survey_champion'
  | 'deep_reader'
  | 'skimmer'
  | 'drive_by'
  | 'uncategorized';

const CLUSTER_LABELS: Record<ClusterName, string> = {
  power_user: '파워유저',
  survey_champion: '서베이 챔피언',
  deep_reader: '딥리더',
  skimmer: '스키머',
  drive_by: '드라이브바이',
  uncategorized: '미분류',
};

function classifySession(features: {
  papers_read: number;
  papers_completed: number;
  avg_time_per_paper: number;
  avg_scroll_depth: number;
  surveys_completed: number;
  survey_rate: number;
  session_duration: number;
}): ClusterName {
  const { papers_read, avg_time_per_paper, avg_scroll_depth, surveys_completed, survey_rate, session_duration } =
    features;

  // Priority order classification
  if (papers_read >= 10 && surveys_completed >= 5 && avg_time_per_paper >= 120) {
    return 'power_user';
  }
  if (survey_rate >= 0.5 && surveys_completed >= 3) {
    return 'survey_champion';
  }
  if (avg_time_per_paper >= 180 && avg_scroll_depth >= 80) {
    return 'deep_reader';
  }
  if (papers_read >= 5 && avg_time_per_paper < 60 && avg_scroll_depth < 50) {
    return 'skimmer';
  }
  if (papers_read <= 2 && surveys_completed === 0 && session_duration < 300) {
    return 'drive_by';
  }
  return 'uncategorized';
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();
    const supabase = createAdminClient();

    // Fetch all data sources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions = await fetchAllRows((supabase as any).from('anonymous_sessions').select('id, created_at, last_active_at'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reads = await fetchAllRows((supabase as any).from('paper_read_progress').select('session_id, paper_id, scroll_percentage, read_complete, time_spent_seconds'));

    const surveys = await fetchAllRows(supabase.from('surveys').select('session_id, paper_id, responses'));

    const votes = await fetchAllRows(supabase.from('votes').select('session_id'));

    const { data: papers } = await supabase.from('papers').select('id, tags').is('deleted_at', null).is('hidden_at' as string, null);

    const paperList = papers ?? [];

    // Build paper-to-tags lookup
    const paperTagsMap: Record<string, string[]> = {};
    for (const paper of paperList as Array<{ id: string; tags: string[] | null }>) {
      paperTagsMap[paper.id] = paper.tags ?? [];
    }

    // Index reads by session
    const readsBySession: Record<
      string,
      Array<{
        paper_id: string;
        scroll_percentage: number;
        read_complete: boolean;
        time_spent_seconds: number;
      }>
    > = {};
    for (const row of reads) {
      const r = row as {
        session_id: string;
        paper_id: string;
        scroll_percentage: number;
        read_complete: boolean;
        time_spent_seconds: number;
      };
      if (!readsBySession[r.session_id]) readsBySession[r.session_id] = [];
      readsBySession[r.session_id].push(r);
    }

    // Index surveys by session
    const surveysBySession: Record<
      string,
      Array<{ paper_id: string; responses: Array<{ questionId: string; value: string }> }>
    > = {};
    for (const row of surveys) {
      const s = row as {
        session_id: string;
        paper_id: string;
        responses: Array<{ questionId: string; value: string }>;
      };
      if (!surveysBySession[s.session_id]) surveysBySession[s.session_id] = [];
      surveysBySession[s.session_id].push(s);
    }

    // Index votes by session
    const votesBySession: Record<string, number> = {};
    for (const row of votes) {
      const v = row as { session_id: string };
      votesBySession[v.session_id] = (votesBySession[v.session_id] ?? 0) + 1;
    }

    // Compute per-session features and classify
    interface SessionFeatures {
      session_id: string;
      papers_read: number;
      papers_completed: number;
      total_time: number;
      avg_time_per_paper: number;
      avg_scroll_depth: number;
      surveys_completed: number;
      survey_rate: number;
      votes_cast: number;
      tags_explored: number;
      session_duration: number;
      avg_rating: number | null;
      cluster: ClusterName;
    }

    const sessionFeatures: SessionFeatures[] = [];

    for (const session of sessions) {
      const s = session as { id: string; created_at: string; last_active_at: string };
      const sessionReads = readsBySession[s.id] ?? [];
      const sessionSurveys = surveysBySession[s.id] ?? [];

      // Distinct paper_ids read
      const distinctPaperIds = new Set(sessionReads.map((r) => r.paper_id));
      const papers_read = distinctPaperIds.size;
      const papers_completed = sessionReads.filter((r) => r.read_complete).length;

      const total_time = sessionReads.reduce((sum, r) => sum + (r.time_spent_seconds ?? 0), 0);
      const avg_time_per_paper = papers_read > 0 ? total_time / papers_read : 0;

      const scrollValues = sessionReads.map((r) => r.scroll_percentage ?? 0);
      const avg_scroll_depth =
        scrollValues.length > 0 ? scrollValues.reduce((sum, v) => sum + v, 0) / scrollValues.length : 0;

      const surveys_completed = sessionSurveys.length;
      const survey_rate = papers_read > 0 ? surveys_completed / papers_read : 0;

      const votes_cast = votesBySession[s.id] ?? 0;

      // Tags explored = distinct tags across papers read
      const exploredTagSet = new Set<string>();
      for (const paperId of distinctPaperIds) {
        for (const tag of paperTagsMap[paperId] ?? []) {
          exploredTagSet.add(tag);
        }
      }
      const tags_explored = exploredTagSet.size;

      // Session duration in seconds
      const createdAt = new Date(s.created_at).getTime();
      const lastActiveAt = new Date(s.last_active_at).getTime();
      const session_duration = isNaN(createdAt) || isNaN(lastActiveAt) ? 0 : Math.max(0, (lastActiveAt - createdAt) / 1000);

      // Average rating from q2-1
      const ratingValues: number[] = [];
      for (const survey of sessionSurveys) {
        const rawValue = getResponseValue(survey.responses, 'q2-1');
        if (rawValue !== undefined) {
          const numeric = getSurveyNumericValue('q2-1', rawValue);
          if (numeric !== null) ratingValues.push(numeric);
        }
      }
      const avg_rating =
        ratingValues.length > 0 ? ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length : null;

      const cluster = classifySession({
        papers_read,
        papers_completed,
        avg_time_per_paper,
        avg_scroll_depth,
        surveys_completed,
        survey_rate,
        session_duration,
      });

      sessionFeatures.push({
        session_id: s.id,
        papers_read,
        papers_completed,
        total_time,
        avg_time_per_paper,
        avg_scroll_depth,
        surveys_completed,
        survey_rate,
        votes_cast,
        tags_explored,
        session_duration,
        avg_rating,
        cluster,
      });
    }

    const total_sessions = sessionFeatures.length;

    // Build cluster summaries
    const clusterNames: ClusterName[] = [
      'power_user',
      'survey_champion',
      'deep_reader',
      'skimmer',
      'drive_by',
      'uncategorized',
    ];

    const clusters = clusterNames.map((name) => {
      const members = sessionFeatures.filter((sf) => sf.cluster === name);
      const count = members.length;
      const percentage = total_sessions > 0 ? Math.round((count / total_sessions) * 10000) / 100 : 0;

      const avg = (getter: (sf: SessionFeatures) => number) =>
        count > 0 ? members.reduce((sum, sf) => sum + getter(sf), 0) / count : 0;

      return {
        name,
        label: CLUSTER_LABELS[name],
        count,
        percentage,
        avg_metrics: {
          papers_read: Math.round(avg((sf) => sf.papers_read) * 100) / 100,
          avg_time_per_paper: Math.round(avg((sf) => sf.avg_time_per_paper) * 100) / 100,
          avg_scroll_depth: Math.round(avg((sf) => sf.avg_scroll_depth) * 100) / 100,
          survey_rate: Math.round(avg((sf) => sf.survey_rate) * 10000) / 10000,
          votes_cast: Math.round(avg((sf) => sf.votes_cast) * 100) / 100,
        },
      };
    });

    // Scatter data limited to 500 entries
    const scatter_data = sessionFeatures.slice(0, 500).map((sf) => ({
      session_id: sf.session_id,
      papers_read: sf.papers_read,
      avg_time_per_paper: sf.avg_time_per_paper,
      surveys_completed: sf.surveys_completed,
      cluster: sf.cluster,
    }));

    // Demographics per cluster
    const demographics: Record<
      string,
      {
        organization: Record<string, number>;
        user_type: Record<string, number>;
        frequency: Record<string, number>;
      }
    > = {};

    for (const name of clusterNames) {
      demographics[name] = { organization: {}, user_type: {}, frequency: {} };
    }

    // Build session-to-cluster lookup
    const sessionClusterMap: Record<string, ClusterName> = {};
    for (const sf of sessionFeatures) {
      sessionClusterMap[sf.session_id] = sf.cluster;
    }

    // Iterate all surveys for demographics
    for (const row of surveys) {
      const s = row as {
        session_id: string;
        responses: Array<{ questionId: string; value: string }>;
      };
      const cluster = sessionClusterMap[s.session_id];
      if (!cluster) continue;

      const demo = demographics[cluster];
      const responses = s.responses;
      if (!responses) continue;

      const org = getResponseValue(responses, 'q1-organization');
      if (org) {
        demo.organization[org] = (demo.organization[org] ?? 0) + 1;
      }

      const userType = getResponseValue(responses, 'q1-1');
      if (userType) {
        demo.user_type[userType] = (demo.user_type[userType] ?? 0) + 1;
      }

      const frequency = getResponseValue(responses, 'q1-2');
      if (frequency) {
        demo.frequency[frequency] = (demo.frequency[frequency] ?? 0) + 1;
      }
    }

    const result = {
      clusters,
      scatter_data,
      demographics,
      total_sessions,
    };

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching behavior analysis:', error);
    return internalErrorResponse('Failed to fetch behavior analysis');
  }
}
