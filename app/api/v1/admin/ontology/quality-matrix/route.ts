import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';
import {
  fetchAllRows,
  getSurveyNumericValue,
  getResponseValue,
  minMaxNormalize,
  pearsonCorrelation,
} from '@/lib/ontology/utils';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const supabase = createAdminClient();

    const { data: papersRaw } = await supabase
      .from('papers')
      .select('id, title, tags, survey_count')
      .is('deleted_at', null)
      .is('hidden_at' as string, null);

    const papers = papersRaw as Array<{
      id: string;
      title: string;
      tags: string[];
      survey_count: number;
    }> | null;

    const surveys = await fetchAllRows<{
      paper_id: string;
      responses: Array<{ questionId: string; value: string }>;
    }>(supabase.from('surveys').select('paper_id, responses'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reads = await fetchAllRows<{
      paper_id: string;
      time_spent_seconds: number;
      scroll_percentage: number;
    }>((supabase as any).from('paper_read_progress').select('paper_id, time_spent_seconds, scroll_percentage'));

    const votes = await fetchAllRows<{ paper_id: string }>(
      supabase.from('votes').select('paper_id')
    );

    if (!papers) {
      return successResponse({
        papers: [],
        medians: { quality: 0, engagement: 0 },
        correlation: { reading_time_vs_rating: { r: 0, n: 0 } },
        tag_summary: [],
        hidden_gems: [],
      });
    }

    // Group surveys and reads by paper_id
    const surveysByPaper = new Map<string, typeof surveys>();
    for (const survey of surveys) {
      if (!surveysByPaper.has(survey.paper_id)) surveysByPaper.set(survey.paper_id, []);
      surveysByPaper.get(survey.paper_id)!.push(survey);
    }

    const readsByPaper = new Map<string, typeof reads>();
    for (const read of reads) {
      if (!readsByPaper.has(read.paper_id)) readsByPaper.set(read.paper_id, []);
      readsByPaper.get(read.paper_id)!.push(read);
    }

    // Compute raw engagement metrics per paper
    const rawReadCounts: number[] = [];
    const rawAvgTimes: number[] = [];
    const rawAvgScrolls: number[] = [];
    const rawSurveyCounts: number[] = [];

    const paperMetrics = papers.map((paper) => {
      const paperReads = readsByPaper.get(paper.id) ?? [];
      const paperSurveys = surveysByPaper.get(paper.id) ?? [];

      const read_count = paperReads.length;
      const avg_time =
        paperReads.length > 0
          ? paperReads.reduce((s, r) => s + (r.time_spent_seconds ?? 0), 0) / paperReads.length
          : 0;
      const avg_scroll =
        paperReads.length > 0
          ? paperReads.reduce((s, r) => s + (r.scroll_percentage ?? 0), 0) / paperReads.length / 100
          : 0;
      const survey_count = paperSurveys.length;

      rawReadCounts.push(read_count);
      rawAvgTimes.push(avg_time);
      rawAvgScrolls.push(avg_scroll);
      rawSurveyCounts.push(survey_count);

      // Quality score
      let quality_score: number | null = null;
      let avg_rating: number | null = null;
      if (paperSurveys.length >= 3) {
        const q2_1_vals = paperSurveys
          .map((s) => getSurveyNumericValue('q2-1', getResponseValue(s.responses, 'q2-1') ?? ''))
          .filter((v): v is number => v !== null);
        const q2_3_vals = paperSurveys
          .map((s) => getSurveyNumericValue('q2-3', getResponseValue(s.responses, 'q2-3') ?? ''))
          .filter((v): v is number => v !== null);
        const q2_5_vals = paperSurveys
          .map((s) => getSurveyNumericValue('q2-5', getResponseValue(s.responses, 'q2-5') ?? ''))
          .filter((v): v is number => v !== null);

        if (q2_1_vals.length > 0 && q2_3_vals.length > 0 && q2_5_vals.length > 0) {
          const q2_1_avg = q2_1_vals.reduce((s, v) => s + v, 0) / q2_1_vals.length;
          const q2_3_avg = q2_3_vals.reduce((s, v) => s + v, 0) / q2_3_vals.length;
          const q2_5_avg = q2_5_vals.reduce((s, v) => s + v, 0) / q2_5_vals.length;

          quality_score =
            0.4 * ((q2_1_avg - 1) / 4) +
            0.3 * ((q2_5_avg - 1) / 3) +
            0.3 * ((q2_3_avg - 1) / 4);

          avg_rating = q2_1_avg;
        }
      } else if (paperSurveys.length > 0) {
        const q2_1_vals = paperSurveys
          .map((s) => getSurveyNumericValue('q2-1', getResponseValue(s.responses, 'q2-1') ?? ''))
          .filter((v): v is number => v !== null);
        if (q2_1_vals.length > 0) {
          avg_rating = q2_1_vals.reduce((s, v) => s + v, 0) / q2_1_vals.length;
        }
      }

      return {
        id: paper.id,
        title: paper.title as string,
        tags: (paper.tags as string[]) ?? [],
        quality_score,
        avg_rating,
        metrics: {
          read_count,
          avg_time_spent: avg_time,
          avg_scroll_depth: avg_scroll,
          survey_count,
          avg_rating,
        },
      };
    });

    // Min-max normalize engagement components across all papers
    const normReadCounts = minMaxNormalize(rawReadCounts);
    const normAvgTimes = minMaxNormalize(rawAvgTimes);
    const normAvgScrolls = minMaxNormalize(rawAvgScrolls);
    const normSurveyCounts = minMaxNormalize(rawSurveyCounts);

    const papersWithEngagement = paperMetrics.map((paper, i) => {
      const engagement_score =
        0.3 * normReadCounts[i] +
        0.3 * normAvgTimes[i] +
        0.2 * normAvgScrolls[i] +
        0.2 * normSurveyCounts[i];

      return { ...paper, engagement_score };
    });

    // Compute medians for quality and engagement
    const qualityValues = papersWithEngagement
      .filter((p) => p.quality_score !== null)
      .map((p) => p.quality_score as number);
    const engagementValues = papersWithEngagement.map((p) => p.engagement_score);

    const qualityMedian = median(qualityValues);
    const engagementMedian = median(engagementValues);

    // Quadrant classification
    type Quadrant = 'star' | 'hidden_gem' | 'popular_questionable' | 'needs_attention' | null;

    const result = papersWithEngagement.map((paper) => {
      let quadrant: Quadrant = null;
      if (paper.quality_score !== null) {
        const highQuality = paper.quality_score >= qualityMedian;
        const highEngagement = paper.engagement_score >= engagementMedian;
        if (highQuality && highEngagement) quadrant = 'star';
        else if (highQuality && !highEngagement) quadrant = 'hidden_gem';
        else if (!highQuality && highEngagement) quadrant = 'popular_questionable';
        else quadrant = 'needs_attention';
      }

      return {
        id: paper.id,
        title: paper.title,
        tags: paper.tags,
        quality_score: paper.quality_score,
        engagement_score: paper.engagement_score,
        quadrant,
        metrics: paper.metrics,
      };
    });

    // Correlation: reading time vs q2-1 rating
    const correlationPairs: { time: number; rating: number }[] = [];
    for (const read of reads) {
      const paperSurveys = surveysByPaper.get(read.paper_id) ?? [];
      for (const survey of paperSurveys) {
        const rating = getSurveyNumericValue(
          'q2-1',
          getResponseValue(survey.responses, 'q2-1') ?? ''
        );
        if (rating !== null && read.time_spent_seconds != null) {
          correlationPairs.push({ time: read.time_spent_seconds, rating });
        }
      }
    }

    const corrR =
      correlationPairs.length >= 2
        ? pearsonCorrelation(
            correlationPairs.map((p) => p.time),
            correlationPairs.map((p) => p.rating)
          )
        : 0;

    // Tag-level summary
    const tagMap = new Map<
      string,
      { qualitySum: number; qualityCount: number; engagementSum: number; paperCount: number }
    >();

    for (const paper of result) {
      for (const tag of paper.tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { qualitySum: 0, qualityCount: 0, engagementSum: 0, paperCount: 0 });
        }
        const entry = tagMap.get(tag)!;
        entry.paperCount += 1;
        entry.engagementSum += paper.engagement_score;
        if (paper.quality_score !== null) {
          entry.qualitySum += paper.quality_score;
          entry.qualityCount += 1;
        }
      }
    }

    const tag_summary = Array.from(tagMap.entries()).map(([tag, data]) => ({
      tag,
      avg_quality: data.qualityCount > 0 ? data.qualitySum / data.qualityCount : 0,
      avg_engagement: data.paperCount > 0 ? data.engagementSum / data.paperCount : 0,
      paper_count: data.paperCount,
    }));

    // Hidden gems list
    const hidden_gems = result
      .filter((p) => p.quadrant === 'hidden_gem')
      .map((p) => ({
        id: p.id,
        title: p.title,
        quality_score: p.quality_score as number,
        engagement_score: p.engagement_score,
      }));

    return successResponse({
      papers: result,
      medians: { quality: qualityMedian, engagement: engagementMedian },
      correlation: {
        reading_time_vs_rating: { r: corrR, n: correlationPairs.length },
      },
      tag_summary,
      hidden_gems,
    });
  } catch (error) {
    console.error('Error fetching quality matrix:', error);
    return internalErrorResponse('Failed to fetch quality matrix');
  }
}
