/**
 * Context Composer: Builds context pack for LLM execution
 */

import type {
  UserContext,
  PaperContext,
  AdditionalContextData,
  TriggerEvent,
  ConversationMessage,
  SkillDefinition,
} from './types';
import { getSkillDefinition } from './pre-orchestrator';

/**
 * Estimate token count for a text string
 * Korean: ~1.5-2 tokens per character
 * English: ~0.25 tokens per character (4 chars per token)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;

  const koreanChars = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const numbers = (text.match(/\d+/g) || []).length;
  const spaces = (text.match(/\s/g) || []).length;
  const specialChars = text.length - koreanChars - (text.match(/[a-zA-Z0-9\s]/g) || []).length;

  const tokens = Math.ceil(
    koreanChars * 1.8 +
    englishWords * 1.3 +
    numbers * 1 +
    spaces * 0.1 +
    specialChars * 0.5
  );

  return Math.max(1, tokens);
}

/**
 * Truncate text to fit within token budget
 */
function truncateToTokenBudget(text: string, maxTokens: number): string {
  let currentTokens = estimateTokens(text);

  if (currentTokens <= maxTokens) {
    return text;
  }

  // Binary search for the right length
  let low = 0;
  let high = text.length;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const truncated = text.slice(0, mid);
    if (estimateTokens(truncated) <= maxTokens) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return text.slice(0, low) + '...';
}

/**
 * Build user state context module
 */
function buildUserStateModule(userContext?: UserContext): string {
  if (!userContext) {
    return `[UserState]
- 세션: 익명 사용자
- 첫 방문: 알 수 없음
`;
  }

  return `[UserState]
- 세션 ID: ${userContext.session_id}
- 첫 방문: ${userContext.is_first_visit ? '예' : '아니오'}
- 방문 횟수: ${userContext.visit_count}회
- 사용자 이름: ${userContext.user_name || '(없음)'}
- 선호 언어: ${userContext.preferred_language || 'ko'}
${userContext.reading_history?.length ? `- 읽은 논문: ${userContext.reading_history.length}개` : ''}
${userContext.survey_history?.length ? `- 참여 설문: ${userContext.survey_history.length}개` : ''}
`;
}

/**
 * Build paper metadata context module
 */
function buildPaperMetadataModule(paper?: PaperContext): string {
  if (!paper) {
    return '';
  }

  return `[PaperMetadata]
- ID: ${paper.paper_id}
- 제목: ${paper.title}
- 저자: ${paper.authors.join(', ')}
${paper.abstract ? `- 초록: ${paper.abstract}` : ''}
${paper.tags?.length ? `- 태그: ${paper.tags.join(', ')}` : ''}
`;
}

/**
 * Build paper chunks context module
 */
function buildPaperChunksModule(paper?: PaperContext, maxTokens: number = 4000): string {
  if (!paper?.chunks?.length) {
    return '';
  }

  let chunksContent = paper.chunks.join('\n\n---\n\n');
  chunksContent = truncateToTokenBudget(chunksContent, maxTokens);

  return `[PaperChunks]
${chunksContent}
`;
}

/**
 * Build search results context module
 */
function buildSearchResultsModule(additionalData?: AdditionalContextData): string {
  if (!additionalData?.search_results?.length) {
    return `[SearchResults]
(검색 결과 없음)
`;
  }

  const results = additionalData.search_results
    .map((r, i) => `${i + 1}. [${r.paper_id}] "${r.title}" - ${r.authors.join(', ')} (유사도: ${(r.score * 100).toFixed(1)}%)${r.snippet ? `\n   ${r.snippet}` : ''}`)
    .join('\n');

  return `[SearchResults]
${results}
`;
}

/**
 * Build survey responses context module
 */
function buildSurveyResponsesModule(additionalData?: AdditionalContextData): string {
  if (!additionalData?.survey_responses?.length) {
    return '';
  }

  const responses = additionalData.survey_responses
    .map((r) => `- Q${r.question_id}: ${Array.isArray(r.answer) ? r.answer.join(', ') : r.answer}`)
    .join('\n');

  return `[SurveyResponses]
${responses}
`;
}

/**
 * Build conversation history context module
 */
function buildConversationHistoryModule(
  history?: ConversationMessage[],
  maxTurns: number = 6
): string {
  if (!history?.length) {
    return '';
  }

  const recentHistory = history.slice(-maxTurns * 2);
  const historyContent = recentHistory
    .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('\n');

  return `[ConversationHistory]
${historyContent}
`;
}

/**
 * Build reading history context module
 */
function buildReadingHistoryModule(userContext?: UserContext): string {
  if (!userContext?.reading_history?.length) {
    return `[ReadingHistory]
(읽은 논문 없음)
`;
  }

  return `[ReadingHistory]
읽은 논문 ID: ${userContext.reading_history.join(', ')}
`;
}

/**
 * Build previous response context module (for chained skills)
 */
function buildPreviousResponseModule(additionalData?: AdditionalContextData): string {
  if (!additionalData?.previous_response && !additionalData?.previous_signals) {
    return '';
  }

  let content = '[PreviousResponse]\n';

  if (additionalData.previous_signals) {
    const sig = additionalData.previous_signals;
    content += `이전 스킬 Signals:
- coverage: ${sig.coverage}
- confidence: ${sig.confidence}
- next_action_hint: ${sig.next_action_hint}
${sig.suggested_skill_id ? `- suggested_skill_id: ${sig.suggested_skill_id}` : ''}
`;
  }

  if (additionalData.previous_response) {
    content += `
이전 응답 내용:
${additionalData.previous_response}
`;
  }

  return content;
}

/**
 * Main context pack builder
 */
export function buildContextPack(
  skillId: string,
  trigger: TriggerEvent,
  userContext?: UserContext,
  additionalData?: AdditionalContextData,
  history?: ConversationMessage[]
): string {
  const skill = getSkillDefinition(skillId);
  const budget = skill?.budget || { context_tokens: 4000, history_turns: 4 };

  let contextPack = `[Trigger]
- event: ${trigger}
- skill_id: ${skillId}

[UserInput]
- locale: "${userContext?.preferred_language || 'ko'}"

`;

  // Build required modules based on skill
  const requires = skill?.requires || [];

  // User state is commonly needed
  if (requires.includes('user_state') || requires.includes('UserState')) {
    contextPack += buildUserStateModule(userContext);
  }

  // Paper metadata
  if (requires.includes('paper_metadata') || requires.includes('PaperMetadata')) {
    contextPack += buildPaperMetadataModule(additionalData?.paper);
  }

  // Paper chunks
  if (requires.includes('paper_chunks') || requires.includes('PaperChunks')) {
    const chunkBudget = Math.min(budget.context_tokens * 0.6, 4000);
    contextPack += buildPaperChunksModule(additionalData?.paper, chunkBudget);
  }

  // Vector/keyword search results
  if (requires.includes('vector_search') || requires.includes('keyword_search')) {
    contextPack += buildSearchResultsModule(additionalData);
  }

  // Survey responses
  if (requires.includes('survey_responses') || requires.includes('SurveyResponses')) {
    contextPack += buildSurveyResponsesModule(additionalData);
  }

  // Conversation history
  if (requires.includes('conversation_history') || requires.includes('ConversationHistory')) {
    contextPack += buildConversationHistoryModule(history, budget.history_turns);
  }

  // Reading history
  if (requires.includes('reading_history') || requires.includes('ReadingHistory')) {
    contextPack += buildReadingHistoryModule(userContext);
  }

  // Previous response (for chained skills)
  if (requires.includes('PreviousResponse')) {
    contextPack += buildPreviousResponseModule(additionalData);
  }

  // Truncate entire context pack if needed
  contextPack = truncateToTokenBudget(contextPack, budget.context_tokens);

  return contextPack;
}

/**
 * Build a minimal context pack for quick responses
 */
export function buildMinimalContextPack(
  skillId: string,
  trigger: TriggerEvent,
  userContext?: UserContext
): string {
  return `[Trigger]
- event: ${trigger}
- skill_id: ${skillId}

[UserInput]
- locale: "${userContext?.preferred_language || 'ko'}"

${buildUserStateModule(userContext)}`;
}
