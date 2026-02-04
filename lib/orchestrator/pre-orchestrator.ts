/**
 * Pre-Orchestrator: Determines which skill to execute based on trigger and context
 */

import type {
  TriggerEvent,
  PreOrchestratorOutput,
  UserContext,
  ConversationMessage,
  ExecutionSignals,
  SkillRegistry,
} from './types';

// Load skill registry
function loadSkillRegistry(): SkillRegistry {
  // In production, this could be loaded from a file or database
  return {
    skills: [
      {
        skill_id: 'greeting',
        description: '사이트 방문 시 인사 및 안내',
        triggers: ['site_enter', 'first_visit'],
        requires: ['user_state'],
        budget: { context_tokens: 2000, history_turns: 2 },
      },
      {
        skill_id: 'paper_search',
        description: '논문 검색 (키워드 + 벡터)',
        triggers: ['search_query', 'user_question'],
        requires: ['vector_search', 'keyword_search'],
        budget: { context_tokens: 4000, search_topk: 10, history_turns: 4 },
      },
      {
        skill_id: 'paper_explain',
        description: '선택된 논문 요약 및 설명',
        triggers: ['paper_select', 'paper_open', 'explain_request'],
        requires: ['paper_chunks', 'paper_metadata'],
        budget: { context_tokens: 8000, history_turns: 4 },
      },
      {
        skill_id: 'survey_complete',
        description: '설문 완료 축하 및 논문 추천',
        triggers: ['survey_submitted'],
        requires: ['survey_responses', 'vector_search'],
        budget: { context_tokens: 4000, candidates_topk: 5, history_turns: 2 },
      },
      {
        skill_id: 'recommend_next',
        description: '다음 논문 추천',
        triggers: ['paper_read_complete', 'ask_recommendation'],
        requires: ['reading_history', 'vector_search'],
        budget: { context_tokens: 4000, candidates_topk: 5, history_turns: 4 },
      },
      {
        skill_id: 'general_chat',
        description: '일반 대화 및 질문 응답',
        triggers: ['default'],
        requires: ['conversation_history'],
        budget: { context_tokens: 3000, history_turns: 6 },
      },
    ],
  };
}

// Intent detection patterns
const INTENT_PATTERNS = {
  search: [
    /검색/,
    /찾아/,
    /논문.*있/,
    /어떤.*논문/,
    /관련.*논문/,
    /search/i,
    /find/i,
    /paper.*about/i,
  ],
  recommend: [
    /추천/,
    /다음/,
    /다른.*논문/,
    /뭐.*읽/,
    /recommend/i,
    /suggest/i,
    /what.*read/i,
  ],
  explain: [
    /설명/,
    /요약/,
    /알려/,
    /뭐야/,
    /무엇/,
    /자세히/,
    /explain/i,
    /summarize/i,
    /what.*is/i,
  ],
  greeting: [
    /안녕/,
    /반가/,
    /처음/,
    /시작/,
    /hello/i,
    /hi\b/i,
    /hey/i,
  ],
};

/**
 * Analyze user message to detect intent
 */
function detectIntent(message: string): string | null {
  if (!message) return null;

  const lowerMessage = message.toLowerCase();

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }
  }

  return null;
}

/**
 * Rule-based routing fallback
 */
function ruleBasedRouting(
  trigger: TriggerEvent,
  message: string | undefined,
  userContext: UserContext | undefined
): PreOrchestratorOutput {
  const registry = loadSkillRegistry();

  // Handle explicit triggers first
  switch (trigger) {
    case 'site_enter':
    case 'first_visit': {
      const skill = registry.skills.find((s) => s.skill_id === 'greeting');
      return {
        skill_id: 'greeting',
        requires: skill?.requires || ['user_state'],
        query: null,
        reason: '사이트 방문으로 인사 스킬 선택',
      };
    }
    case 'paper_select':
    case 'paper_open':
    case 'explain_request': {
      const skill = registry.skills.find((s) => s.skill_id === 'paper_explain');
      return {
        skill_id: 'paper_explain',
        requires: skill?.requires || ['paper_chunks', 'paper_metadata'],
        query: null,
        reason: '논문 선택으로 설명 스킬 선택',
      };
    }
    case 'survey_submitted': {
      const skill = registry.skills.find((s) => s.skill_id === 'survey_complete');
      return {
        skill_id: 'survey_complete',
        requires: skill?.requires || ['survey_responses', 'vector_search'],
        query: null,
        reason: '설문 완료로 축하 스킬 선택',
      };
    }
    case 'paper_read_complete':
    case 'ask_recommendation': {
      const skill = registry.skills.find((s) => s.skill_id === 'recommend_next');
      return {
        skill_id: 'recommend_next',
        requires: skill?.requires || ['reading_history', 'vector_search'],
        query: message || null,
        reason: '논문 읽기 완료로 추천 스킬 선택',
      };
    }
    case 'search_query': {
      const skill = registry.skills.find((s) => s.skill_id === 'paper_search');
      return {
        skill_id: 'paper_search',
        requires: skill?.requires || ['vector_search', 'keyword_search'],
        query: message || null,
        reason: '검색 쿼리로 검색 스킬 선택',
      };
    }
  }

  // Intent-based routing from message
  if (message) {
    const intent = detectIntent(message);

    if (intent === 'search') {
      const skill = registry.skills.find((s) => s.skill_id === 'paper_search');
      return {
        skill_id: 'paper_search',
        requires: skill?.requires || ['vector_search', 'keyword_search'],
        query: message,
        reason: '검색 의도 감지로 검색 스킬 선택',
      };
    }

    if (intent === 'recommend') {
      const skill = registry.skills.find((s) => s.skill_id === 'recommend_next');
      return {
        skill_id: 'recommend_next',
        requires: skill?.requires || ['reading_history', 'vector_search'],
        query: message,
        reason: '추천 의도 감지로 추천 스킬 선택',
      };
    }

    if (intent === 'greeting') {
      const skill = registry.skills.find((s) => s.skill_id === 'greeting');
      return {
        skill_id: 'greeting',
        requires: skill?.requires || ['user_state'],
        query: null,
        reason: '인사 의도 감지로 인사 스킬 선택',
      };
    }
  }

  // First visit fallback
  if (userContext?.is_first_visit) {
    const skill = registry.skills.find((s) => s.skill_id === 'greeting');
    return {
      skill_id: 'greeting',
      requires: skill?.requires || ['user_state'],
      query: null,
      reason: '첫 방문으로 인사 스킬 선택',
    };
  }

  // Default to general_chat
  const skill = registry.skills.find((s) => s.skill_id === 'general_chat');
  return {
    skill_id: 'general_chat',
    requires: skill?.requires || ['conversation_history'],
    query: message || null,
    reason: '기본 일반 대화 스킬 선택',
  };
}

/**
 * Pre-Orchestrator main function
 * Determines which skill to execute based on trigger, message, and context
 */
export async function preOrchestrate(
  trigger: TriggerEvent,
  message: string | undefined,
  userContext: UserContext | undefined,
  history?: ConversationMessage[],
  previousSignals?: ExecutionSignals
): Promise<PreOrchestratorOutput> {
  const registry = loadSkillRegistry();

  // 1. If previous signals indicate reroute, follow that
  if (previousSignals?.next_action_hint === 'reroute' && previousSignals?.suggested_skill_id) {
    const suggestedSkill = registry.skills.find(
      (s) => s.skill_id === previousSignals.suggested_skill_id
    );
    if (suggestedSkill) {
      return {
        skill_id: previousSignals.suggested_skill_id,
        requires: suggestedSkill.requires,
        query: message || null,
        reason: `이전 스킬의 reroute 힌트에 따라 ${previousSignals.suggested_skill_id}로 전환`,
      };
    }
  }

  // 2. Try rule-based routing first (fast path)
  const ruleResult = ruleBasedRouting(trigger, message, userContext);

  // For now, use rule-based routing
  // In production, this could call an LLM for more complex intent detection
  return ruleResult;
}

/**
 * Get skill definition by ID
 */
export function getSkillDefinition(skillId: string) {
  const registry = loadSkillRegistry();
  return registry.skills.find((s) => s.skill_id === skillId);
}

export { loadSkillRegistry };
