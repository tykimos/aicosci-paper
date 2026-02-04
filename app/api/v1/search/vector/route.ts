import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEmbedding } from '@/lib/embeddings/azure-embeddings';
import {
  successResponse,
  badRequestResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import type { Paper } from '@/types/database';

interface VectorSearchRequest {
  query: string;
  topK?: number;      // default: 10
  threshold?: number; // default: 0.7
  paperId?: string;   // optional: search within specific paper
}

export interface ChunkResult {
  id: string;
  paper_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

interface PaperScore {
  paper: Paper;
  avgSimilarity: number;
  maxSimilarity: number;
  chunkCount: number;
  matchedChunks: Array<{
    content: string;
    similarity: number;
    chunkIndex: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VectorSearchRequest;

    // Validate request
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return badRequestResponse('Query is required and must be a non-empty string');
    }

    const query = body.query.trim();
    const topK = body.topK && body.topK > 0 ? Math.min(body.topK, 50) : 10;
    const threshold = body.threshold !== undefined ? body.threshold : 0.7;
    const paperId = body.paperId;

    // Validate threshold
    if (threshold < 0 || threshold > 1) {
      return badRequestResponse('Threshold must be between 0 and 1');
    }

    // Step 1: Generate embedding for query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await createEmbedding(query);
    } catch (error) {
      console.error('Error generating query embedding:', error);
      return internalErrorResponse('Failed to generate query embedding');
    }

    // Step 2: Call match_paper_chunks Supabase function
    const supabase = await createClient();

    // Determine match count (more chunks initially, we'll aggregate by paper)
    const matchCount = topK * 5; // Get more chunks to aggregate by paper

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: searchError } = await (supabase.rpc as any)('match_paper_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: threshold,
      match_count: matchCount,
    });

    if (searchError) {
      console.error('Error searching paper chunks:', searchError);
      return internalErrorResponse('Failed to search paper chunks');
    }

    const chunks = (data || []) as ChunkResult[];

    if (chunks.length === 0) {
      return successResponse({
        query,
        results: [],
        count: 0,
        params: {
          topK,
          threshold,
          paperId: paperId || null,
        },
      });
    }

    // Step 3: Filter by paperId if specified
    let filteredChunks = chunks;
    if (paperId) {
      filteredChunks = chunks.filter(chunk => chunk.paper_id === paperId);
    }

    if (filteredChunks.length === 0) {
      return successResponse({
        query,
        results: [],
        count: 0,
        params: {
          topK,
          threshold,
          paperId: paperId || null,
        },
      });
    }

    // Step 4: Group by paper_id and aggregate scores
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

    // Step 5: Fetch paper metadata
    const paperIds = Array.from(paperMap.keys());
    const { data: papersData, error: papersError } = await supabase
      .from('papers')
      .select('*')
      .in('id', paperIds)
      .is('deleted_at', null);

    if (papersError) {
      console.error('Error fetching papers:', papersError);
      return internalErrorResponse('Failed to fetch paper metadata');
    }

    const papers = (papersData || []) as Paper[];

    if (papers.length === 0) {
      return successResponse({
        query,
        results: [],
        count: 0,
        params: {
          topK,
          threshold,
          paperId: paperId || null,
        },
      });
    }

    // Step 6: Calculate aggregate scores and create results
    const results: PaperScore[] = papers.map((paper) => {
      const paperData = paperMap.get(paper.id)!;
      const avgSimilarity = paperData.similarities.reduce((a, b) => a + b, 0) / paperData.similarities.length;
      const maxSimilarity = Math.max(...paperData.similarities);

      // Sort chunks by similarity
      const sortedChunks = paperData.chunks.sort((a, b) => b.similarity - a.similarity);

      return {
        paper: paper as Paper,
        avgSimilarity,
        maxSimilarity,
        chunkCount: paperData.similarities.length,
        matchedChunks: sortedChunks.slice(0, 3), // Return top 3 chunks per paper
      };
    });

    // Step 7: Sort by weighted score (70% max similarity + 30% average similarity)
    results.sort((a, b) => {
      const scoreA = a.maxSimilarity * 0.7 + a.avgSimilarity * 0.3;
      const scoreB = b.maxSimilarity * 0.7 + b.avgSimilarity * 0.3;
      return scoreB - scoreA;
    });

    // Step 8: Return top K results
    const topResults = results.slice(0, topK);

    return successResponse({
      query,
      results: topResults,
      count: topResults.length,
      params: {
        topK,
        threshold,
        paperId: paperId || null,
      },
    });

  } catch (error) {
    console.error('Unexpected error in vector search:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}
