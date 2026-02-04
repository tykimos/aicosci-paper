import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import type { PaperSummary, PaperChunk } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  methodology?: string;
  results?: string;
  conclusion?: string;
  cached: boolean;
}

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT!;
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION!;

async function callAzureOpenAI(messages: Array<{ role: string; content: string }>) {
  const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_API_KEY,
    },
    body: JSON.stringify({
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateChunkSummary(chunk: string): Promise<string> {
  const messages = [
    {
      role: 'system',
      content: 'You are a research paper summarization assistant. Summarize the given text chunk concisely, focusing on key findings and methodologies.',
    },
    {
      role: 'user',
      content: `Summarize this section of a research paper:\n\n${chunk}`,
    },
  ];

  return await callAzureOpenAI(messages);
}

async function generateFinalSummary(content: string): Promise<{
  summary: string;
  keyPoints: string[];
  methodology?: string;
  results?: string;
  conclusion?: string;
}> {
  const messages = [
    {
      role: 'system',
      content: `You are a research paper summarization assistant. Analyze the paper and provide:
1. A comprehensive summary (2-3 paragraphs)
2. Key points (3-5 bullet points)
3. Methodology section summary (if present)
4. Results section summary (if present)
5. Conclusion section summary (if present)

Return your response in JSON format with keys: summary, keyPoints (array), methodology, results, conclusion.`,
    },
    {
      role: 'user',
      content: `Analyze this research paper content:\n\n${content}`,
    },
  ];

  const response = await callAzureOpenAI(messages);

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response);
    return {
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      methodology: parsed.methodology,
      results: parsed.results,
      conclusion: parsed.conclusion,
    };
  } catch {
    // If not JSON, return as plain summary
    return {
      summary: response,
      keyPoints: [],
    };
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if paper exists
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('id, title')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (paperError || !paper) {
      return notFoundResponse('Paper not found');
    }

    // Check for cached summary
    const { data: cachedSummary, error: cacheError } = await supabase
      .from('paper_summaries')
      .select('summary, key_points, methodology, results, conclusion')
      .eq('paper_id', id)
      .eq('language', 'en')
      .single<Pick<PaperSummary, 'summary' | 'key_points' | 'methodology' | 'results' | 'conclusion'>>();

    if (!cacheError && cachedSummary) {
      const response: SummaryResponse = {
        summary: cachedSummary.summary,
        keyPoints: cachedSummary.key_points || [],
        methodology: cachedSummary.methodology,
        results: cachedSummary.results,
        conclusion: cachedSummary.conclusion,
        cached: true,
      };
      return successResponse(response);
    }

    // Fetch paper chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('paper_chunks')
      .select('id, chunk_index, content, metadata')
      .eq('paper_id', id)
      .order('chunk_index', { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      return notFoundResponse('Paper content not found. Please ensure the paper has been processed.');
    }

    let finalContent: string;

    // Two-stage summarization for papers with many chunks
    if (chunks.length > 10) {
      // Stage 1: Summarize each chunk
      const chunkSummaries = await Promise.all(
        chunks.map((chunk: PaperChunk) => generateChunkSummary(chunk.content))
      );
      finalContent = chunkSummaries.join('\n\n');
    } else {
      // For smaller papers, combine all chunks
      finalContent = chunks.map((chunk: PaperChunk) => chunk.content).join('\n\n');
    }

    // Stage 2: Generate final structured summary
    const summaryData = await generateFinalSummary(finalContent);

    // Cache the summary using admin client (RLS requires service role)
    const adminClient = createAdminClient();
    const insertData = {
      paper_id: id,
      summary: summaryData.summary,
      key_points: summaryData.keyPoints,
      methodology: summaryData.methodology,
      results: summaryData.results,
      conclusion: summaryData.conclusion,
      language: 'en',
    };
    const { error: insertError } = await adminClient
      .from('paper_summaries')
      .insert(insertData as any);

    if (insertError) {
      console.error('Failed to cache summary:', insertError);
      // Continue anyway - we have the summary
    }

    const response: SummaryResponse = {
      ...summaryData,
      cached: false,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Summary generation error:', error);
    return internalErrorResponse(
      error instanceof Error ? error.message : 'Failed to generate summary'
    );
  }
}
