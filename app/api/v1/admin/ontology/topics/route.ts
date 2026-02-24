import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';
import { fetchAllRows, getSurveyNumericValue, getResponseValue } from '@/lib/ontology/utils';

interface PaperRow {
  id: string;
  title: string;
  tags: string[] | null;
  survey_count: number | null;
}

interface TagRow {
  name: string;
  paper_count: number | null;
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();
    const supabase = createAdminClient();

    // Fetch papers
    const { data: papersRaw } = await supabase
      .from('papers')
      .select('id, title, tags, survey_count')
      .is('deleted_at', null)
      .is('hidden_at' as string, null);

    // Fetch tags
    const { data: tagsRaw } = await supabase.from('tags').select('name, paper_count');

    // Fetch read progress - paginated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reads = await fetchAllRows((supabase as any).from('paper_read_progress').select('paper_id'));

    // Fetch surveys - paginated
    const surveys = await fetchAllRows(supabase.from('surveys').select('paper_id, responses'));

    const paperList = (papersRaw ?? []) as unknown as PaperRow[];
    const tagList = (tagsRaw ?? []) as unknown as TagRow[];

    // --- A. Tag Co-occurrence Matrix ---
    const pairCounts: Record<string, number> = {};
    const tagSet = new Set<string>();

    for (const paper of paperList) {
      const paperTags: string[] = paper.tags ?? [];
      for (const tag of paperTags) {
        tagSet.add(tag);
      }
      for (let i = 0; i < paperTags.length; i++) {
        for (let j = i + 1; j < paperTags.length; j++) {
          const t1 = paperTags[i] < paperTags[j] ? paperTags[i] : paperTags[j];
          const t2 = paperTags[i] < paperTags[j] ? paperTags[j] : paperTags[i];
          const key = `${t1}|||${t2}`;
          pairCounts[key] = (pairCounts[key] ?? 0) + 1;
        }
      }
    }

    const matrix = Object.entries(pairCounts).map(([key, count]) => {
      const [tag1, tag2] = key.split('|||');
      return { tag1, tag2, count };
    });

    const allTags = Array.from(tagSet).sort();

    // --- B. Tag Engagement Rankings ---

    // Build maps: paperId -> read count, paperId -> survey rows
    const readCountByPaper: Record<string, number> = {};
    for (const row of reads) {
      const paperId = (row as { paper_id: string }).paper_id;
      readCountByPaper[paperId] = (readCountByPaper[paperId] ?? 0) + 1;
    }

    const surveysByPaper: Record<string, Array<{ responses: unknown }>> = {};
    for (const row of surveys) {
      const survey = row as { paper_id: string; responses: unknown };
      if (!surveysByPaper[survey.paper_id]) {
        surveysByPaper[survey.paper_id] = [];
      }
      surveysByPaper[survey.paper_id].push({ responses: survey.responses });
    }

    // Group papers by tag
    const papersByTag: Record<string, PaperRow[]> = {};
    for (const paper of paperList) {
      const paperTags: string[] = paper.tags ?? [];
      for (const tag of paperTags) {
        if (!papersByTag[tag]) {
          papersByTag[tag] = [];
        }
        papersByTag[tag].push(paper);
      }
    }

    // Also include tags from the tags table that may have no papers in the filtered set
    for (const tagRow of tagList) {
      if (!papersByTag[tagRow.name]) {
        papersByTag[tagRow.name] = [];
      }
    }

    const tag_rankings = Object.entries(papersByTag).map(([tag, tagPapers]) => {
      const paper_count = tagPapers.length;

      let total_reads = 0;
      let total_surveys = 0;
      const ratingValues: number[] = [];

      for (const paper of tagPapers) {
        total_reads += readCountByPaper[paper.id] ?? 0;
        const paperSurveys = surveysByPaper[paper.id] ?? [];
        total_surveys += paperSurveys.length;

        for (const survey of paperSurveys) {
          const responses = survey.responses as Array<{ questionId: string; value: string }> | null;
          if (!responses) continue;
          const rawValue = getResponseValue(responses, 'q2-1');
          if (rawValue !== undefined) {
            const numeric = getSurveyNumericValue('q2-1', rawValue);
            if (numeric !== null) {
              ratingValues.push(numeric);
            }
          }
        }
      }

      const avg_rating =
        ratingValues.length > 0
          ? ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length
          : null;

      const engagement_rate = total_reads > 0 ? total_surveys / total_reads : 0;

      return {
        tag,
        paper_count,
        total_reads,
        total_surveys,
        avg_rating,
        engagement_rate,
      };
    });

    const result = {
      co_occurrence: {
        matrix,
        tags: allTags,
      },
      tag_rankings,
    };

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching topic analysis:', error);
    return internalErrorResponse('Failed to fetch topic analysis');
  }
}
