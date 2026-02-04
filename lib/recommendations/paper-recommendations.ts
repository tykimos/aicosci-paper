import { createClient } from '@/lib/supabase/server';
import { createEmbedding } from '@/lib/embeddings/azure-embeddings';
import type { Paper } from '@/types/database';

export interface RecommendedPaper extends Paper {
  similarity: number;
  reason: string;
}

/**
 * Get similar papers based on a paper's content
 */
export async function getSimilarPapers(
  paperId: string,
  options: { topK?: number; threshold?: number } = {}
): Promise<RecommendedPaper[]> {
  const { topK = 5, threshold = 0.7 } = options;
  const supabase = await createClient();

  // Get the paper's chunks to create a combined embedding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: chunks, error: chunksError } = await (supabase as any)
    .from('paper_chunks')
    .select('content, embedding')
    .eq('paper_id', paperId)
    .order('chunk_index')
    .limit(5); // First 5 chunks (usually abstract + intro)

  type ChunkRow = { content: string; embedding: number[] | null };

  if (chunksError || !chunks || chunks.length === 0) {
    console.error('Error fetching paper chunks:', chunksError);
    return [];
  }

  const typedChunks = chunks as ChunkRow[];

  // Combine top chunks into a query
  const combinedContent = typedChunks.map((c) => c.content).join(' ').slice(0, 2000);

  // Create embedding for the combined content
  const queryEmbedding = await createEmbedding(combinedContent);

  // Find similar papers
  type ChunkMatch = {
    paper_id: string;
    similarity: number;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: matches, error: matchError } = await (supabase.rpc as any)(
    'match_paper_chunks',
    {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: threshold,
      match_count: topK * 10,
    }
  );

  if (matchError) {
    console.error('Error finding similar papers:', matchError);
    return [];
  }

  const chunkMatches = (matches || []) as ChunkMatch[];

  // Exclude the source paper and aggregate by paper
  const paperScores = new Map<string, number[]>();

  for (const match of chunkMatches) {
    if (match.paper_id === paperId) continue;

    if (!paperScores.has(match.paper_id)) {
      paperScores.set(match.paper_id, []);
    }
    paperScores.get(match.paper_id)!.push(match.similarity);
  }

  // Calculate average similarity per paper
  const rankedPapers = Array.from(paperScores.entries())
    .map(([id, scores]) => ({
      paperId: id,
      similarity: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  if (rankedPapers.length === 0) {
    return [];
  }

  // Fetch paper details
  const { data: fetchedPapers, error: papersError } = await supabase
    .from('papers')
    .select('*')
    .in(
      'id',
      rankedPapers.map((p) => p.paperId)
    )
    .is('deleted_at', null);

  if (papersError) {
    console.error('Error fetching papers:', papersError);
    return [];
  }

  const typedPapers = (fetchedPapers || []) as Paper[];
  const papersMap = new Map(typedPapers.map((p) => [p.id, p]));

  return rankedPapers
    .map(({ paperId: pId, similarity }) => {
      const paper = papersMap.get(pId);
      if (!paper) return null;

      return {
        ...paper,
        similarity,
        reason: `${Math.round(similarity * 100)}% 유사도`,
      } as RecommendedPaper;
    })
    .filter((p): p is RecommendedPaper => p !== null);
}

/**
 * Get personalized recommendations based on user's survey responses
 */
export async function getRecommendationsFromSurvey(
  sessionId: string,
  options: { topK?: number } = {}
): Promise<RecommendedPaper[]> {
  const { topK = 5 } = options;
  const supabase = await createClient();

  // Get user's survey responses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: responses, error: responsesError } = await (supabase as any)
    .from('survey_responses')
    .select(
      `
      paper_id,
      papers!inner (
        id,
        title,
        tags
      )
    `
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (responsesError || !responses || responses.length === 0) {
    return [];
  }

  // Extract tags from surveyed papers
  interface ResponseWithPaper {
    paper_id: string;
    papers: {
      id: string;
      title: string;
      tags: string[];
    };
  }

  const typedResponses = responses as ResponseWithPaper[];
  const tags = typedResponses.flatMap((r) => r.papers?.tags || []);

  if (tags.length === 0) {
    return [];
  }

  // Build interest query from tags
  const interestQuery = [...new Set(tags)].slice(0, 5).join(' ');

  // Create embedding for interest
  const queryEmbedding = await createEmbedding(interestQuery);

  // Find similar papers
  type ChunkMatch = {
    paper_id: string;
    similarity: number;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: matches, error: matchError } = await (supabase.rpc as any)(
    'match_paper_chunks',
    {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.6,
      match_count: topK * 10,
    }
  );

  if (matchError) {
    console.error('Error finding recommendations:', matchError);
    return [];
  }

  const chunkMatches = (matches || []) as ChunkMatch[];

  // Exclude papers user already surveyed
  const surveyedPaperIds = new Set(typedResponses.map((r) => r.paper_id));

  const paperScores = new Map<string, number[]>();

  for (const match of chunkMatches) {
    if (surveyedPaperIds.has(match.paper_id)) continue;

    if (!paperScores.has(match.paper_id)) {
      paperScores.set(match.paper_id, []);
    }
    paperScores.get(match.paper_id)!.push(match.similarity);
  }

  // Rank papers
  const rankedPapers = Array.from(paperScores.entries())
    .map(([id, scores]) => ({
      paperId: id,
      similarity: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  if (rankedPapers.length === 0) {
    return [];
  }

  // Fetch paper details
  const { data: fetchedPapers, error: papersError } = await supabase
    .from('papers')
    .select('*')
    .in(
      'id',
      rankedPapers.map((p) => p.paperId)
    )
    .is('deleted_at', null);

  if (papersError) {
    console.error('Error fetching papers:', papersError);
    return [];
  }

  const typedPapers = (fetchedPapers || []) as Paper[];
  const papersMap = new Map(typedPapers.map((p) => [p.id, p]));

  return rankedPapers
    .map(({ paperId: pId, similarity }) => {
      const paper = papersMap.get(pId);
      if (!paper) return null;

      return {
        ...paper,
        similarity,
        reason: '관심 분야 기반 추천',
      } as RecommendedPaper;
    })
    .filter((p): p is RecommendedPaper => p !== null);
}

/**
 * Get random recommendations for new users
 */
export async function getRandomRecommendations(
  options: { topK?: number } = {}
): Promise<RecommendedPaper[]> {
  const { topK = 5 } = options;
  const supabase = await createClient();

  // Get popular papers based on vote count
  const { data: fetchedPapers, error } = await supabase
    .from('papers')
    .select('*')
    .is('deleted_at', null)
    .order('vote_count', { ascending: false })
    .limit(topK);

  if (error) {
    console.error('Error fetching random recommendations:', error);
    return [];
  }

  const typedPapers = (fetchedPapers || []) as Paper[];

  return typedPapers.map((paper) => ({
    ...paper,
    similarity: 1.0,
    reason: '인기 논문',
  }));
}
