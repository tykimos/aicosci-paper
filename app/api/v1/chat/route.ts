/**
 * Chat API Route Handler
 * POST /api/v1/chat
 *
 * Integrates the orchestrator pipeline for chat interactions
 * Supports both regular JSON responses and SSE streaming
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Paper } from '@/types/database';
import {
  preOrchestrate,
  buildContextPack,
  executeSkill,
  executeSkillStream,
  postOrchestrate,
  shouldContinueChain,
  type TriggerEvent,
  type UserContext,
  type ConversationMessage,
  type AdditionalContextData,
  type ExecutionSignals,
  type SearchResult,
  type ChatRequest,
  type ChatResponse,
} from '@/lib/orchestrator';
import { hybridSearch } from '@/lib/search/hybrid-search';

// Maximum chain depth to prevent infinite loops
const MAX_CHAIN_DEPTH = 3;

/**
 * Perform hybrid search on papers (vector + keyword)
 */
async function searchPapers(
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  try {
    // Use hybrid search which combines vector and keyword search
    const results = await hybridSearch(query, {
      topK,
      threshold: 0.5, // Lower threshold for more results
      vectorWeight: 0.7,  // Prefer semantic similarity
      keywordWeight: 0.3,
    });

    return results.map((result) => ({
      paper_id: result.paper.id,
      title: result.paper.title,
      authors: result.paper.authors || [],
      score: result.score,
      snippet: result.matchedChunks?.[0]?.content || result.paper.abstract?.slice(0, 200),
      tags: result.paper.tags || [],
    }));
  } catch (error) {
    console.error('[Chat] Hybrid search failed, falling back to keyword search:', error);

    // Fallback to simple keyword search
    try {
      const supabase = await createClient();
      const { data, error: dbError } = await supabase
        .from('papers')
        .select('id, title, authors, abstract, tags')
        .is('deleted_at', null)
        .or(`title.ilike.%${query}%,abstract.ilike.%${query}%`)
        .limit(topK);

      if (dbError) {
        console.error('[Chat] Fallback search error:', dbError);
        return [];
      }

      const papers = (data || []) as Pick<Paper, 'id' | 'title' | 'authors' | 'abstract' | 'tags'>[];

      return papers.map((paper, index) => ({
        paper_id: paper.id,
        title: paper.title,
        authors: paper.authors || [],
        score: 1 - index * 0.1,
        snippet: paper.abstract?.slice(0, 200),
        tags: paper.tags || [],
      }));
    } catch (fallbackError) {
      console.error('[Chat] Fallback search failed:', fallbackError);
      return [];
    }
  }
}

/**
 * Get paper details by ID
 */
async function getPaperDetails(paperId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (error || !data) {
      return null;
    }

    const paper = data as Paper;

    return {
      paper_id: paper.id,
      title: paper.title,
      authors: paper.authors || [],
      abstract: paper.abstract,
      tags: paper.tags || [],
      // chunks would be fetched from a separate table in production
      chunks: paper.abstract ? [paper.abstract] : [],
    };
  } catch (error) {
    console.error('[Chat] Get paper failed:', error);
    return null;
  }
}

/**
 * Main chat handler
 */
async function handleChat(request: ChatRequest): Promise<ChatResponse> {
  const {
    message,
    trigger = 'default',
    session_id,
    history = [],
    user_context,
    paper_context,
    additional_data = {},
  } = request;

  // Build user context
  const userContext: UserContext = {
    session_id,
    is_first_visit: user_context?.is_first_visit ?? history.length === 0,
    visit_count: user_context?.visit_count ?? 1,
    user_name: user_context?.user_name,
    preferred_language: user_context?.preferred_language ?? 'ko',
    reading_history: user_context?.reading_history,
    survey_history: user_context?.survey_history,
  };

  let chainDepth = 0;
  let currentTrigger: TriggerEvent = trigger as TriggerEvent;
  let currentSignals: ExecutionSignals | undefined;
  let finalResult: {
    content: string;
    signals: ExecutionSignals;
    promptButtons?: string[];
  } | null = null;
  let searchResults: SearchResult[] = [];
  let recommendedPapers: SearchResult[] = [];

  // Orchestration loop (handles skill chaining)
  while (chainDepth < MAX_CHAIN_DEPTH) {
    // 1. Pre-orchestrate: Determine which skill to execute
    const orchestration = await preOrchestrate(
      currentTrigger,
      message,
      userContext,
      history,
      currentSignals
    );

    console.log(`[Chat] Chain ${chainDepth}: ${orchestration.skill_id} - ${orchestration.reason}`);

    // 2. Build additional data based on skill requirements
    const additionalContextData: AdditionalContextData = { ...additional_data };

    // Fetch paper if needed
    if (
      paper_context?.paper_id &&
      orchestration.requires.some((r) =>
        ['paper_chunks', 'paper_metadata', 'PaperChunks', 'PaperMetadata'].includes(r)
      )
    ) {
      const paper = await getPaperDetails(paper_context.paper_id);
      if (paper) {
        additionalContextData.paper = paper;
      }
    }

    // Perform search if needed
    if (
      orchestration.query &&
      orchestration.requires.some((r) =>
        ['vector_search', 'keyword_search'].includes(r)
      )
    ) {
      searchResults = await searchPapers(orchestration.query);
      additionalContextData.search_results = searchResults;
    }

    // Get recommendations if needed
    if (orchestration.requires.some((r) => r === 'vector_search' || r === 'reading_history')) {
      if (orchestration.skill_id === 'recommend_next' || orchestration.skill_id === 'survey_complete') {
        // Use search results or get random papers
        recommendedPapers = searchResults.length > 0
          ? searchResults.slice(0, 5)
          : await searchPapers('AI machine learning', 5);
        additionalContextData.search_results = recommendedPapers;
      }
    }

    // Carry forward previous signals and response for chaining
    if (currentSignals) {
      additionalContextData.previous_signals = currentSignals;
    }
    if (finalResult?.content) {
      additionalContextData.previous_response = finalResult.content;
    }

    // 3. Build context pack
    const contextPack = buildContextPack(
      orchestration.skill_id,
      currentTrigger,
      userContext,
      additionalContextData,
      history
    );

    // 4. Execute skill
    const result = await executeSkill(
      orchestration.skill_id,
      contextPack,
      message,
      history
    );

    finalResult = {
      content: result.content,
      signals: result.signals,
      promptButtons: result.promptButtons,
    };

    // 5. Post-orchestrate: Check if we need to chain to another skill
    const postResult = postOrchestrate(result.signals, orchestration.skill_id);

    if (postResult.action === 'stop' || !shouldContinueChain(result.signals, orchestration.skill_id, chainDepth)) {
      break;
    }

    // Prepare for next iteration
    currentSignals = result.signals;
    currentTrigger = 'default';
    chainDepth++;
  }

  if (!finalResult) {
    return {
      success: false,
      error: {
        code: 'EXECUTION_FAILED',
        message: '응답 생성에 실패했습니다.',
      },
    };
  }

  return {
    success: true,
    data: {
      message: finalResult.content,
      skill_id: 'chat',
      signals: finalResult.signals,
      prompt_buttons: finalResult.promptButtons,
      search_results: searchResults.length > 0 ? searchResults : undefined,
      recommended_papers: recommendedPapers.length > 0 ? recommendedPapers : undefined,
    },
  };
}

/**
 * Handle streaming response
 */
async function handleStreamingChat(request: ChatRequest): Promise<Response> {
  const {
    message,
    trigger = 'default',
    session_id,
    history = [],
    user_context,
    paper_context,
    additional_data = {},
  } = request;

  // Build user context
  const userContext: UserContext = {
    session_id,
    is_first_visit: user_context?.is_first_visit ?? history.length === 0,
    visit_count: user_context?.visit_count ?? 1,
    user_name: user_context?.user_name,
    preferred_language: user_context?.preferred_language ?? 'ko',
    reading_history: user_context?.reading_history,
    survey_history: user_context?.survey_history,
  };

  // Pre-orchestrate to determine skill
  const orchestration = await preOrchestrate(
    trigger as TriggerEvent,
    message,
    userContext,
    history
  );

  // Build additional context data
  const additionalContextData: AdditionalContextData = { ...additional_data };

  // Fetch paper if needed
  if (paper_context?.paper_id) {
    const paper = await getPaperDetails(paper_context.paper_id);
    if (paper) {
      additionalContextData.paper = paper;
    }
  }

  // Perform search if needed
  if (orchestration.query && orchestration.requires.some((r) => ['vector_search', 'keyword_search'].includes(r))) {
    const searchResults = await searchPapers(orchestration.query);
    additionalContextData.search_results = searchResults;
  }

  // Build context pack
  const contextPack = buildContextPack(
    orchestration.skill_id,
    trigger as TriggerEvent,
    userContext,
    additionalContextData,
    history
  );

  // Execute with streaming
  const stream = await executeSkillStream(
    orchestration.skill_id,
    contextPack,
    message,
    history
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * POST /api/v1/chat
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.session_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'session_id is required',
          },
        },
        { status: 400 }
      );
    }

    // Check if streaming is requested
    const acceptHeader = request.headers.get('accept') || '';
    const isStreaming = acceptHeader.includes('text/event-stream') || body.stream === true;

    if (isStreaming) {
      return handleStreamingChat(body);
    }

    const response = await handleChat(body);
    return NextResponse.json(response, {
      status: response.success ? 200 : 500,
    });
  } catch (error) {
    console.error('[Chat] Request error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
