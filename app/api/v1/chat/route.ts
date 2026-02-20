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

// Diverse fallback queries for recommendations (instead of always "인공지능")
const RECOMMENDATION_QUERIES = [
  '머신러닝 딥러닝', '자연어처리 NLP', '컴퓨터 비전 이미지',
  '강화학습 로봇', '생물정보학 바이오', '의료 AI 진단',
  '기후 환경 예측', '재료과학 물성', '화학 분자 시뮬레이션',
  '물리학 시뮬레이션', '천문학 우주', '에너지 최적화',
  '약물 발견 신약', '유전체 분석', '단백질 구조 예측',
];

/** Pick a random fallback query */
function getRandomQuery(): string {
  return RECOMMENDATION_QUERIES[Math.floor(Math.random() * RECOMMENDATION_QUERIES.length)];
}

// Common non-searchable words to filter out when extracting context keywords
const STOP_WORDS = new Set([
  '논문', '추천', '해줘', '해주세요', '알려줘', '알려주세요', '보여줘',
  '다른', '다음', '더', '좀', '하나', '뭐', '어떤', '관련', '관한',
  '있나', '있어', '없나', '없어', '인가', '인지', '볼까', '읽을',
  '검색', '찾아', '설명', '요약', '자세히', '간단히',
  '네', '예', '아니', '그래', '좋아', '감사', '고마워',
  '안녕', '반가워', '처음', '시작', '홈', '으로',
  '에', '의', '을', '를', '이', '가', '은', '는', '도', '와', '과',
  '로', '으로', '에서', '까지', '부터', '만', '보다',
]);

/**
 * Extract meaningful search query from conversation context.
 * Returns null if no useful context found (caller should use random fallback).
 */
function extractContextQuery(
  message: string | undefined,
  history: ConversationMessage[],
  paperTitle?: string | null,
  paperTags?: string[],
): string | null {
  // 1. If there's a currently viewed paper, use its title as search context
  if (paperTitle) {
    // Remove common prefixes/noise and use as related-paper search
    return paperTitle;
  }

  // 2. Extract substantive keywords from recent user messages in history
  const userMessages = history
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .slice(-5); // last 5 user messages

  // Include current message if it has substance
  if (message) userMessages.push(message);

  // Gather all words, filter stop words, keep meaningful terms
  const allWords: string[] = [];
  for (const msg of userMessages) {
    const words = msg
      .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
    allWords.push(...words);
  }

  // If we have paper tags from context, include them
  if (paperTags?.length) {
    allWords.push(...paperTags);
  }

  // Deduplicate and take top keywords
  const unique = [...new Set(allWords)];
  if (unique.length === 0) return null;

  // Take up to 5 keywords for search
  const keywords = unique.slice(-5).join(' ');
  return keywords || null;
}

/** Fisher-Yates shuffle */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Perform hybrid search on papers (vector + keyword)
 */
async function searchPapers(
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  try {
    console.log(`[Chat] Hybrid search for: "${query}"`);

    // Use hybrid search which combines vector and keyword search
    const results = await hybridSearch(query, {
      topK,
      threshold: 0.3, // Lower threshold for more results
      vectorWeight: 0.7,  // Prefer semantic similarity
      keywordWeight: 0.3,
    });

    console.log(`[Chat] Hybrid search returned ${results.length} results`);

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
        .is('hidden_at' as string, null)
        .or(`title.ilike.%${query}%,abstract.ilike.%${query}%`)
        .limit(topK);

      if (dbError) {
        console.error('[Chat] Fallback search error:', dbError);
        return [];
      }

      const papers = (data || []) as Pick<Paper, 'id' | 'title' | 'authors' | 'abstract' | 'tags'>[];
      console.log(`[Chat] Fallback search returned ${papers.length} papers`);

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
 * Get paper details by ID, including actual chunks from vector DB
 */
async function getPaperDetails(paperId: string) {
  try {
    const supabase = await createClient();

    // Fetch paper metadata
    const { data: paperData, error: paperError } = await supabase
      .from('papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (paperError || !paperData) {
      return null;
    }

    const paper = paperData as Paper;

    // Fetch actual chunks from vector DB
    const { data: chunksData } = await supabase
      .from('paper_chunks')
      .select('content, chunk_index')
      .eq('paper_id', paperId)
      .order('chunk_index', { ascending: true })
      .limit(20);

    const chunks = (chunksData || []).map((c: { content: string }) => c.content);

    return {
      paper_id: paper.id,
      title: paper.title,
      authors: paper.authors || [],
      abstract: paper.abstract,
      tags: paper.tags || [],
      chunks: chunks.length > 0 ? chunks : (paper.abstract ? [paper.abstract] : []),
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

    // Perform search if needed - for any skill that requires vector_search
    if (orchestration.requires.some((r) => ['vector_search', 'keyword_search'].includes(r))) {
      const isRecommendation = orchestration.skill_id === 'recommend_next' || orchestration.skill_id === 'survey_complete';

      // Build search query: orchestrator query > context-aware extraction > random fallback
      let searchQuery = orchestration.query;
      if (!searchQuery || isRecommendation) {
        const paperDetails = additionalContextData.paper;
        const contextQuery = extractContextQuery(
          message,
          history,
          paperDetails?.title || null,
          paperDetails?.tags,
        );
        if (contextQuery) {
          searchQuery = contextQuery;
          console.log(`[Chat] Using context-aware query: "${searchQuery}"`);
        } else {
          searchQuery = isRecommendation ? getRandomQuery() : (message || 'AI 과학 연구');
          console.log(`[Chat] Using ${isRecommendation ? 'random' : 'default'} query: "${searchQuery}"`);
        }
      }

      searchResults = await searchPapers(searchQuery, isRecommendation ? 20 : 10);
      console.log(`[Chat] Search returned ${searchResults.length} results`);

      // Fallback with random query if no results
      if (isRecommendation && searchResults.length === 0) {
        const fallbackQuery = getRandomQuery();
        console.log(`[Chat] No results, trying random query "${fallbackQuery}"`);
        searchResults = await searchPapers(fallbackQuery, 20);
      }

      // Shuffle results for recommendations so different papers get recommended each time
      if (isRecommendation && searchResults.length > 0) {
        searchResults = shuffleArray(searchResults);
      }

      if (searchResults.length > 0) {
        console.log(`[Chat] First result: ${searchResults[0].title} (ID: ${searchResults[0].paper_id})`);
      }
      additionalContextData.search_results = searchResults;
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

  // Perform search if needed - for any skill that requires vector_search
  if (orchestration.requires.some((r) => ['vector_search', 'keyword_search'].includes(r))) {
    const isRecommendation = orchestration.skill_id === 'recommend_next' || orchestration.skill_id === 'survey_complete';

    // Build search query: orchestrator query > context-aware extraction > random fallback
    let searchQuery = orchestration.query;
    if (!searchQuery || isRecommendation) {
      const paperDetails = additionalContextData.paper;
      const contextQuery = extractContextQuery(
        message,
        history,
        paperDetails?.title || null,
        paperDetails?.tags,
      );
      searchQuery = contextQuery || (isRecommendation ? getRandomQuery() : (message || 'AI 과학 연구'));
    }

    let searchResults = await searchPapers(searchQuery, isRecommendation ? 20 : 10);

    // Fallback with random query
    if (searchResults.length === 0) {
      searchResults = await searchPapers(getRandomQuery(), 20);
    }

    // Shuffle for recommendation diversity
    if (isRecommendation && searchResults.length > 0) {
      searchResults = shuffleArray(searchResults);
    }

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
