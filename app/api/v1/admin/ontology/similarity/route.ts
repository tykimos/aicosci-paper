import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';
import { fetchAllRows, cosineSimilarity, computeCentroid } from '@/lib/ontology/utils';

function parseEmbedding(embedding: unknown): number[] | null {
  if (!embedding) return null;
  if (Array.isArray(embedding)) return embedding;
  if (typeof embedding === 'string') {
    try {
      const parsed = JSON.parse(embedding);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Try pgvector format: [0.1,0.2,...]
      const match = embedding.match(/\[([\d\s,.\-e]+)\]/);
      if (match) return match[1].split(',').map(Number);
    }
  }
  return null;
}

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunks = await fetchAllRows((supabase as any).from('paper_chunks').select('paper_id, embedding'));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: papers } = await (supabase as any)
      .from('papers')
      .select('id, title, tags')
      .is('deleted_at', null)
      .is('hidden_at', null);

    if (!papers) {
      return successResponse({ clusters: [], total_papers_with_embeddings: 0 });
    }

    // Group chunks by paper_id
    const chunksByPaper = new Map<string, number[][]>();
    for (const chunk of chunks) {
      const embedding = parseEmbedding(chunk.embedding);
      if (!embedding) continue;
      const paperId = chunk.paper_id as string;
      if (!chunksByPaper.has(paperId)) {
        chunksByPaper.set(paperId, []);
      }
      chunksByPaper.get(paperId)!.push(embedding);
    }

    // Compute centroid per paper, exclude papers without embeddings
    const paperCentroids: Array<{ id: string; title: string; tags: string[]; centroid: number[] }> = [];

    for (const paper of papers) {
      const paperChunks = chunksByPaper.get(paper.id);
      if (!paperChunks || paperChunks.length === 0) continue;
      const centroid = computeCentroid(paperChunks);
      if (centroid.length === 0) continue;
      paperCentroids.push({
        id: paper.id,
        title: paper.title,
        tags: paper.tags ?? [],
        centroid,
      });
    }

    // Compute pairwise cosine similarity, filter > 0.75, sort desc, top 100
    const clusters: Array<{
      paper1: { id: string; title: string; tags: string[] };
      paper2: { id: string; title: string; tags: string[] };
      similarity: number;
    }> = [];

    for (let i = 0; i < paperCentroids.length; i++) {
      for (let j = i + 1; j < paperCentroids.length; j++) {
        const similarity = cosineSimilarity(paperCentroids[i].centroid, paperCentroids[j].centroid);
        if (similarity > 0.75) {
          clusters.push({
            paper1: {
              id: paperCentroids[i].id,
              title: paperCentroids[i].title,
              tags: paperCentroids[i].tags,
            },
            paper2: {
              id: paperCentroids[j].id,
              title: paperCentroids[j].title,
              tags: paperCentroids[j].tags,
            },
            similarity,
          });
        }
      }
    }

    clusters.sort((a, b) => b.similarity - a.similarity);
    const topClusters = clusters.slice(0, 100);

    return successResponse({
      clusters: topClusters,
      total_papers_with_embeddings: paperCentroids.length,
    });
  } catch (error) {
    console.error('Error fetching similarity analysis:', error);
    return internalErrorResponse('Failed to fetch similarity analysis');
  }
}
