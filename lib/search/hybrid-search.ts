import { createClient } from '@/lib/supabase/server';
import { createEmbedding } from '@/lib/embeddings/azure-embeddings';
import type { Paper } from '@/types/database';

export interface SearchResult {
  paper: Paper;
  score: number;
  relevanceScores: {
    vector?: number;
    keyword?: number;
    combined: number;
  };
  matchedChunks?: Array<{
    content: string;
    similarity: number;
    chunkIndex: number;
  }>;
  matchType: 'vector' | 'keyword' | 'hybrid';
}

export interface HybridSearchOptions {
  topK?: number;           // Number of results to return (default: 10)
  paperId?: string;        // Search within specific paper
  threshold?: number;      // Similarity threshold for vector search (default: 0.7)
  vectorWeight?: number;   // Weight for vector search in fusion (default: 0.6)
  keywordWeight?: number;  // Weight for keyword search in fusion (default: 0.4)
}

interface VectorResult {
  paper_id: string;
  similarity: number;
  chunks: Array<{
    content: string;
    similarity: number;
    chunkIndex: number;
  }>;
}

interface KeywordResult {
  paper: Paper;
  rank: number;
}

/**
 * Perform keyword search on papers
 */
async function keywordSearch(
  query: string,
  options: { topK: number; paperId?: string }
): Promise<KeywordResult[]> {
  const supabase = await createClient();

  let dbQuery = supabase
    .from('papers')
    .select('*')
    .is('deleted_at', null);

  // Add text search filters
  dbQuery = dbQuery.or(`title.ilike.%${query}%,abstract.ilike.%${query}%,authors.cs.{${query}}`);

  // Filter by paperId if specified
  if (options.paperId) {
    dbQuery = dbQuery.eq('id', options.paperId);
  }

  // Get more results for fusion
  dbQuery = dbQuery.limit(options.topK * 2);

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Keyword search error:', error);
    throw new Error(`Keyword search failed: ${error.message}`);
  }

  const papers = (data || []) as Paper[];

  if (papers.length === 0) {
    return [];
  }

  // Calculate keyword relevance score based on match position and frequency
  return papers.map((paper, index) => ({
    paper,
    rank: papers.length - index, // Higher rank for earlier results
  }));
}

/**
 * Perform vector search on paper chunks
 */
async function vectorSearch(
  query: string,
  options: { topK: number; paperId?: string; threshold: number }
): Promise<VectorResult[]> {
  const supabase = await createClient();

  // Generate embedding for query
  const queryEmbedding = await createEmbedding(query);

  // Call match_paper_chunks function
  const matchCount = options.topK * 5; // Get more chunks to aggregate by paper

  type ChunkData = {
    id: string;
    paper_id: string;
    chunk_index: number;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: searchError } = await (supabase.rpc as any)('match_paper_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: options.threshold,
    match_count: matchCount,
  });

  if (searchError) {
    console.error('Vector search error:', searchError);
    throw new Error(`Vector search failed: ${searchError.message}`);
  }

  const chunks = (data || []) as ChunkData[];

  if (chunks.length === 0) {
    return [];
  }

  // Filter by paperId if specified
  let filteredChunks = chunks;
  if (options.paperId) {
    filteredChunks = chunks.filter((chunk) => chunk.paper_id === options.paperId);
  }

  // Group by paper_id
  const paperMap = new Map<string, {
    similarities: number[];
    chunks: Array<{ content: string; similarity: number; chunkIndex: number }>;
  }>();

  for (const chunk of filteredChunks) {
    if (!paperMap.has(chunk.paper_id)) {
      paperMap.set(chunk.paper_id, { similarities: [], chunks: [] });
    }

    const paperData = paperMap.get(chunk.paper_id)!;
    paperData.similarities.push(chunk.similarity);
    paperData.chunks.push({
      content: chunk.content,
      similarity: chunk.similarity,
      chunkIndex: chunk.chunk_index,
    });
  }

  // Calculate aggregate scores
  return Array.from(paperMap.entries()).map(([paperId, data]) => {
    const avgSimilarity = data.similarities.reduce((a, b) => a + b, 0) / data.similarities.length;
    const maxSimilarity = Math.max(...data.similarities);

    // Weighted score: 70% max + 30% average
    const similarity = maxSimilarity * 0.7 + avgSimilarity * 0.3;

    // Sort chunks by similarity
    const sortedChunks = data.chunks.sort((a, b) => b.similarity - a.similarity);

    return {
      paper_id: paperId,
      similarity,
      chunks: sortedChunks.slice(0, 3), // Top 3 chunks
    };
  });
}

/**
 * Reciprocal Rank Fusion (RRF) algorithm
 * Combines rankings from multiple search methods
 */
function reciprocalRankFusion(
  vectorResults: Map<string, VectorResult>,
  keywordResults: Map<string, KeywordResult>,
  options: { vectorWeight: number; keywordWeight: number; k?: number }
): Map<string, number> {
  const k = options.k || 60; // RRF constant
  const scores = new Map<string, number>();

  // Get all unique paper IDs
  const allPaperIds = new Set([
    ...vectorResults.keys(),
    ...keywordResults.keys(),
  ]);

  for (const paperId of allPaperIds) {
    let score = 0;

    // Vector search contribution
    const vectorResult = vectorResults.get(paperId);
    if (vectorResult) {
      // Use similarity directly as it's already normalized 0-1
      score += options.vectorWeight * vectorResult.similarity;
    }

    // Keyword search contribution (normalize rank)
    const keywordResult = keywordResults.get(paperId);
    if (keywordResult) {
      // RRF formula: 1 / (k + rank)
      const normalizedRank = 1 / (k + keywordResult.rank);
      score += options.keywordWeight * normalizedRank;
    }

    scores.set(paperId, score);
  }

  return scores;
}

/**
 * Perform hybrid search combining vector and keyword search
 * Uses Reciprocal Rank Fusion (RRF) for ranking
 */
export async function hybridSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<SearchResult[]> {
  const {
    topK = 10,
    paperId,
    threshold = 0.7,
    vectorWeight = 0.6,
    keywordWeight = 0.4,
  } = options;

  // Validate weights
  const totalWeight = vectorWeight + keywordWeight;
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    throw new Error('Vector and keyword weights must sum to 1.0');
  }

  // Validate query
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  const trimmedQuery = query.trim();

  console.log(`[HybridSearch] Query: "${trimmedQuery}", threshold: ${threshold}`);

  // Execute both searches in parallel
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(trimmedQuery, { topK, paperId, threshold }).catch(error => {
      console.error('[HybridSearch] Vector search failed:', error);
      return [] as VectorResult[];
    }),
    keywordSearch(trimmedQuery, { topK, paperId }).catch(error => {
      console.error('[HybridSearch] Keyword search failed:', error);
      return [] as KeywordResult[];
    }),
  ]);

  console.log(`[HybridSearch] Vector results: ${vectorResults.length}, Keyword results: ${keywordResults.length}`);

  // Convert to maps for easier lookup
  const vectorMap = new Map(vectorResults.map(r => [r.paper_id, r]));
  const keywordMap = new Map(keywordResults.map(r => [r.paper.id, r]));

  // Apply Reciprocal Rank Fusion
  const fusedScores = reciprocalRankFusion(vectorMap, keywordMap, {
    vectorWeight,
    keywordWeight,
  });

  // Fetch all papers
  const allPaperIds = Array.from(fusedScores.keys());
  const supabase = await createClient();

  const { data: papersData, error: papersError } = await supabase
    .from('papers')
    .select('*')
    .in('id', allPaperIds)
    .is('deleted_at', null);

  if (papersError) {
    console.error('Error fetching papers:', papersError);
    throw new Error(`Failed to fetch papers: ${papersError.message}`);
  }

  const papers = (papersData || []) as Paper[];

  if (papers.length === 0) {
    return [];
  }

  // Build final results
  const results: SearchResult[] = papers.map((paper) => {
    const fusedScore = fusedScores.get(paper.id) || 0;
    const vectorResult = vectorMap.get(paper.id);
    const keywordResult = keywordMap.get(paper.id);

    // Determine match type
    let matchType: SearchResult['matchType'] = 'hybrid';
    if (vectorResult && !keywordResult) {
      matchType = 'vector';
    } else if (!vectorResult && keywordResult) {
      matchType = 'keyword';
    }

    return {
      paper: paper as Paper,
      score: fusedScore,
      relevanceScores: {
        vector: vectorResult?.similarity,
        keyword: keywordResult ? 1 / (60 + keywordResult.rank) : undefined,
        combined: fusedScore,
      },
      matchedChunks: vectorResult?.chunks,
      matchType,
    };
  });

  // Sort by fused score
  results.sort((a, b) => b.score - a.score);

  // Return top K results
  return results.slice(0, topK);
}

/**
 * Search using only vector similarity
 */
export async function vectorOnlySearch(
  query: string,
  options: Omit<HybridSearchOptions, 'vectorWeight' | 'keywordWeight'> = {}
): Promise<SearchResult[]> {
  return hybridSearch(query, {
    ...options,
    vectorWeight: 1.0,
    keywordWeight: 0.0,
  });
}

/**
 * Search using only keyword matching
 */
export async function keywordOnlySearch(
  query: string,
  options: Omit<HybridSearchOptions, 'vectorWeight' | 'keywordWeight' | 'threshold'> = {}
): Promise<SearchResult[]> {
  return hybridSearch(query, {
    ...options,
    threshold: 0, // No threshold for keyword-only search
    vectorWeight: 0.0,
    keywordWeight: 1.0,
  });
}
