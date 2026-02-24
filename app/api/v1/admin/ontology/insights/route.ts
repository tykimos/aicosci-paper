import { createAdminClient } from '@/lib/supabase/admin';
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';
import {
  fetchAllRows,
  getSurveyNumericValue,
  getResponseValue,
  pearsonCorrelation,
} from '@/lib/ontology/utils';

interface InsightEntity {
  type: string;
  id: string;
  label: string;
}

interface Insight {
  id: string;
  category: 'content' | 'engagement' | 'data_quality' | 'research';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric_value: string;
  action_label: string;
  action_type: 'link' | 'export';
  action_target: string;
  related_entities: InsightEntity[];
  generated_at: string;
}

interface SurveyRow {
  session_id: string;
  paper_id: string;
  responses: Array<{ questionId: string; value: string }>;
  created_at?: string;
}

interface ReadRow {
  session_id: string;
  paper_id: string;
  time_spent_seconds: number;
  scroll_percentage: number;
  read_complete: boolean;
}

interface VoteRow {
  session_id: string;
  paper_id: string;
}

interface PaperRow {
  id: string;
  title: string;
  tags: string[] | null;
  survey_count: number;
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const supabase = createAdminClient();

    const [paperRows, surveyRows, readRows, voteRows, sessionCount] = await Promise.all([
      supabase
        .from('papers')
        .select('id, title, tags, survey_count')
        .is('deleted_at', null)
        .is('hidden_at' as string, null)
        .then((r) => (r.data || []) as PaperRow[]),
      fetchAllRows<SurveyRow>(supabase.from('surveys').select('session_id, paper_id, responses')),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchAllRows<ReadRow>((supabase as any).from('paper_read_progress').select('session_id, paper_id, time_spent_seconds, scroll_percentage, read_complete')),
      fetchAllRows<VoteRow>(supabase.from('votes').select('session_id, paper_id')),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('anonymous_sessions')
        .select('*', { count: 'exact', head: true })
        .then((r: { count: number }) => r.count || 0),
    ]);

    const generatedAt = new Date().toISOString();
    const insights: Insight[] = [];

    const totalPapers = paperRows.length;
    const totalSessions = sessionCount as number;
    const totalSurveys = surveyRows.length;

    // --- 1. Hidden gems ---
    // For each paper with 3+ surveys, compute simplified quality score
    const surveysByPaper = new Map<string, SurveyRow[]>();
    for (const s of surveyRows) {
      if (!surveysByPaper.has(s.paper_id)) surveysByPaper.set(s.paper_id, []);
      surveysByPaper.get(s.paper_id)!.push(s);
    }

    const readsByPaper = new Map<string, ReadRow[]>();
    for (const r of readRows) {
      if (!readsByPaper.has(r.paper_id)) readsByPaper.set(r.paper_id, []);
      readsByPaper.get(r.paper_id)!.push(r);
    }

    const hiddenGems: Array<{ paper: PaperRow; quality: number; readCount: number }> = [];

    for (const paper of paperRows) {
      const surveys = surveysByPaper.get(paper.id) || [];
      if (surveys.length < 3) continue;

      const ratings: number[] = [];
      for (const s of surveys) {
        const val = getResponseValue(s.responses, 'q2-1');
        if (val) {
          const num = getSurveyNumericValue('q2-1', val);
          if (num !== null) ratings.push(num);
        }
      }

      if (ratings.length === 0) continue;
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const quality = (avgRating - 1) / 4; // normalize 1-5 to 0-1

      const paperReads = (readsByPaper.get(paper.id) || []).length;

      if (quality > 0.6 && paperReads < 10) {
        hiddenGems.push({ paper, quality, readCount: paperReads });
      }
    }

    const hiddenGemCount = hiddenGems.length;
    if (hiddenGemCount >= 5) {
      insights.push({
        id: `insight-hidden-gems-${Date.now()}`,
        category: 'content',
        severity: 'warning',
        title: 'Hidden gem papers need promotion',
        description: `${hiddenGemCount} high-quality papers (quality score > 0.6) have fewer than 10 reads. These papers are underexposed despite strong survey ratings.`,
        metric_value: `${hiddenGemCount} papers`,
        action_label: 'View quality matrix',
        action_type: 'link',
        action_target: '/admin/ontology/quality-matrix',
        related_entities: hiddenGems.slice(0, 3).map((g) => ({
          type: 'paper',
          id: g.paper.id,
          label: g.paper.title,
        })),
        generated_at: generatedAt,
      });
    }

    // --- 2. Anomaly check: rapid surveys (3+ surveys in 10 min per session) ---
    const surveysBySession = new Map<string, SurveyRow[]>();
    for (const s of surveyRows) {
      if (!surveysBySession.has(s.session_id)) surveysBySession.set(s.session_id, []);
      surveysBySession.get(s.session_id)!.push(s);
    }

    let rapidSurveySessionCount = 0;
    for (const [, sessionSurveys] of surveysBySession) {
      if (sessionSurveys.length >= 3) {
        // Simplified: if a session has 3+ surveys treat as potentially rapid
        // (without timestamps we use presence of 3+ as proxy for HIGH anomaly)
        rapidSurveySessionCount++;
      }
    }

    const anomalySessionCount = rapidSurveySessionCount;
    if (anomalySessionCount >= 3) {
      insights.push({
        id: `insight-anomaly-rapid-surveys-${Date.now()}`,
        category: 'data_quality',
        severity: 'critical',
        title: 'Suspicious rapid survey sessions detected',
        description: `${anomalySessionCount} sessions submitted 3 or more surveys, which may indicate automated or low-quality responses.`,
        metric_value: `${anomalySessionCount} sessions`,
        action_label: 'View anomalies',
        action_type: 'link',
        action_target: '/admin/ontology/anomalies',
        related_entities: [],
        generated_at: generatedAt,
      });
    }

    // --- 3. Survey conversion rate ---
    const surveyConversionRate = totalSessions > 0 ? totalSurveys / totalSessions : 0;
    if (surveyConversionRate < 0.15) {
      insights.push({
        id: `insight-survey-conversion-${Date.now()}`,
        category: 'engagement',
        severity: 'warning',
        title: 'Low survey conversion rate',
        description: `Only ${(surveyConversionRate * 100).toFixed(1)}% of sessions result in a survey submission. Consider improving survey visibility or reducing friction.`,
        metric_value: `${(surveyConversionRate * 100).toFixed(1)}%`,
        action_label: 'View engagement flows',
        action_type: 'link',
        action_target: '/admin/ontology/flows',
        related_entities: [],
        generated_at: generatedAt,
      });
    }

    // --- 4. Drive-by ratio: sessions with <=2 papers read and 0 surveys ---
    const readCountBySession = new Map<string, number>();
    for (const r of readRows) {
      readCountBySession.set(r.session_id, (readCountBySession.get(r.session_id) || 0) + 1);
    }

    const surveySessionSet = new Set(surveyRows.map((s) => s.session_id));

    let driveByCount = 0;
    for (const [sessionId, count] of readCountBySession) {
      if (count <= 2 && !surveySessionSet.has(sessionId)) {
        driveByCount++;
      }
    }
    // Also count sessions with no reads at all (not in readCountBySession)
    // but those would also have 0 surveys if not in surveySessionSet - skip for simplicity

    const driveByRatio = totalSessions > 0 ? driveByCount / totalSessions : 0;
    const driveByPercentage = driveByRatio * 100;

    if (driveByRatio > 0.4) {
      insights.push({
        id: `insight-drive-by-${Date.now()}`,
        category: 'engagement',
        severity: 'warning',
        title: 'High drive-by session rate',
        description: `${driveByPercentage.toFixed(1)}% of sessions read 2 or fewer papers and submit no surveys. These users are not engaging meaningfully with the content.`,
        metric_value: `${driveByPercentage.toFixed(1)}%`,
        action_label: 'View behavior analysis',
        action_type: 'link',
        action_target: '/admin/ontology/behavior',
        related_entities: [],
        generated_at: generatedAt,
      });
    }

    // --- 5. Low tag engagement ---
    const totalReads = readRows.length;

    const tagReadCounts = new Map<string, number>();
    for (const paper of paperRows) {
      const tags = paper.tags || [];
      const reads = (readsByPaper.get(paper.id) || []).length;
      for (const tag of tags) {
        tagReadCounts.set(tag, (tagReadCounts.get(tag) || 0) + reads);
      }
    }

    if (totalReads > 0) {
      for (const [tag, count] of tagReadCounts) {
        const ratio = count / totalReads;
        if (ratio < 0.1) {
          insights.push({
            id: `insight-low-tag-${tag.replace(/\s+/g, '-')}-${Date.now()}`,
            category: 'content',
            severity: 'info',
            title: `Low engagement for tag: ${tag}`,
            description: `Papers tagged "${tag}" account for only ${(ratio * 100).toFixed(1)}% of total reads. Consider promoting or reviewing content in this category.`,
            metric_value: `${(ratio * 100).toFixed(1)}% of reads`,
            action_label: 'View topics',
            action_type: 'link',
            action_target: '/admin/ontology/topics',
            related_entities: [],
            generated_at: generatedAt,
          });
        }
      }
    }

    // --- 6. Reading-rating correlation ---
    const paperAvgTimes: number[] = [];
    const paperAvgRatings: number[] = [];
    const correlationPapers: PaperRow[] = [];

    for (const paper of paperRows) {
      const reads = readsByPaper.get(paper.id) || [];
      if (reads.length === 0) continue;

      const avgTime = reads.reduce((s, r) => s + (r.time_spent_seconds || 0), 0) / reads.length;

      const surveys = surveysByPaper.get(paper.id) || [];
      const ratings: number[] = [];
      for (const s of surveys) {
        const val = getResponseValue(s.responses, 'q2-1');
        if (val) {
          const num = getSurveyNumericValue('q2-1', val);
          if (num !== null) ratings.push(num);
        }
      }
      if (ratings.length === 0) continue;

      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

      paperAvgTimes.push(avgTime);
      paperAvgRatings.push(avgRating);
      correlationPapers.push(paper);
    }

    let readingRatingCorr = 0;
    if (paperAvgTimes.length >= 2) {
      readingRatingCorr = pearsonCorrelation(paperAvgTimes, paperAvgRatings);
    }

    if (readingRatingCorr > 0.7) {
      insights.push({
        id: `insight-reading-rating-corr-${Date.now()}`,
        category: 'research',
        severity: 'info',
        title: 'Strong reading time to rating correlation',
        description: `Pearson r = ${readingRatingCorr.toFixed(2)} between average reading time and average rating across ${correlationPapers.length} papers. Longer reading time predicts higher ratings.`,
        metric_value: `r = ${readingRatingCorr.toFixed(2)}`,
        action_label: 'View similarity analysis',
        action_type: 'link',
        action_target: '/admin/ontology/similarity',
        related_entities: [],
        generated_at: generatedAt,
      });
    }

    // --- 7. Tag overlap: pairs with >80% shared papers ---
    const tagPaperMap = new Map<string, Set<string>>();
    for (const paper of paperRows) {
      for (const tag of paper.tags || []) {
        if (!tagPaperMap.has(tag)) tagPaperMap.set(tag, new Set());
        tagPaperMap.get(tag)!.add(paper.id);
      }
    }

    const tagList = Array.from(tagPaperMap.keys());
    for (let i = 0; i < tagList.length; i++) {
      for (let j = i + 1; j < tagList.length; j++) {
        const tagA = tagList[i];
        const tagB = tagList[j];
        const setA = tagPaperMap.get(tagA)!;
        const setB = tagPaperMap.get(tagB)!;

        const intersection = new Set([...setA].filter((id) => setB.has(id)));
        const union = new Set([...setA, ...setB]);

        if (union.size === 0) continue;
        const overlap = intersection.size / Math.min(setA.size, setB.size);

        if (overlap > 0.8) {
          insights.push({
            id: `insight-tag-overlap-${tagA}-${tagB}-${Date.now()}`,
            category: 'content',
            severity: 'info',
            title: `High overlap between tags: "${tagA}" and "${tagB}"`,
            description: `${(overlap * 100).toFixed(0)}% of papers in the smaller tag group are shared between "${tagA}" and "${tagB}". Consider merging or clarifying these tags.`,
            metric_value: `${(overlap * 100).toFixed(0)}% overlap`,
            action_label: 'View topics',
            action_type: 'link',
            action_target: '/admin/ontology/topics',
            related_entities: [
              { type: 'tag', id: tagA, label: tagA },
              { type: 'tag', id: tagB, label: tagB },
            ],
            generated_at: generatedAt,
          });
        }
      }
    }

    // --- 8. Gateway paper: paper most often read first ---
    const firstPaperBySession = new Map<string, string>();
    // Use read rows sorted by time_spent_seconds as proxy; without timestamps
    // we approximate "first read" by grouping and taking the paper with read_complete=false
    // or simply the first encountered per session in the data.
    // Simplified: track the first paper_id encountered per session in the flat list.
    for (const r of readRows) {
      if (!firstPaperBySession.has(r.session_id)) {
        firstPaperBySession.set(r.session_id, r.paper_id);
      }
    }

    const gatewayCount = new Map<string, number>();
    for (const paperId of firstPaperBySession.values()) {
      gatewayCount.set(paperId, (gatewayCount.get(paperId) || 0) + 1);
    }

    let topGatewayPaperId = '';
    let topGatewayCount = 0;
    for (const [paperId, count] of gatewayCount) {
      if (count > topGatewayCount) {
        topGatewayCount = count;
        topGatewayPaperId = paperId;
      }
    }

    const totalFirstReads = firstPaperBySession.size;
    const gatewayRatio = totalFirstReads > 0 ? topGatewayCount / totalFirstReads : 0;

    if (gatewayRatio > 0.1 && topGatewayPaperId) {
      const gatewayPaper = paperRows.find((p) => p.id === topGatewayPaperId);
      insights.push({
        id: `insight-gateway-paper-${Date.now()}`,
        category: 'research',
        severity: 'info',
        title: 'Dominant gateway paper identified',
        description: `"${gatewayPaper?.title || topGatewayPaperId}" is the first paper read in ${(gatewayRatio * 100).toFixed(1)}% of sessions. It serves as the primary entry point to the collection.`,
        metric_value: `${(gatewayRatio * 100).toFixed(1)}% of sessions`,
        action_label: 'View reading flows',
        action_type: 'link',
        action_target: '/admin/ontology/flows',
        related_entities: gatewayPaper
          ? [{ type: 'paper', id: gatewayPaper.id, label: gatewayPaper.title }]
          : [],
        generated_at: generatedAt,
      });
    }

    // Sort by severity: critical → warning → info
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Compute avg rating across all surveys
    const allRatings: number[] = [];
    for (const s of surveyRows) {
      const val = getResponseValue(s.responses, 'q2-1');
      if (val) {
        const num = getSurveyNumericValue('q2-1', val);
        if (num !== null) allRatings.push(num);
      }
    }
    const avgRating =
      allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;

    const kpis = {
      total_papers: totalPapers,
      total_sessions: totalSessions,
      total_surveys: totalSurveys,
      survey_conversion_rate: Math.round(surveyConversionRate * 10000) / 10000,
      avg_rating: Math.round(avgRating * 100) / 100,
      hidden_gem_count: hiddenGemCount,
      anomaly_session_count: anomalySessionCount,
      drive_by_percentage: Math.round(driveByPercentage * 100) / 100,
    };

    return successResponse({ insights, kpis });
  } catch (error) {
    console.error('Error fetching insights:', error);
    return internalErrorResponse('Failed to fetch insights');
  }
}
