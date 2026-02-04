/**
 * Post-Orchestrator: Evaluates signals and determines if rerouting is needed
 */

import type {
  ExecutionSignals,
  PostOrchestratorOutput,
} from './types';
import { loadSkillRegistry } from './pre-orchestrator';

/**
 * Evaluate signals and determine next action
 */
export function postOrchestrate(
  signals: ExecutionSignals,
  currentSkillId: string
): PostOrchestratorOutput {
  const registry = loadSkillRegistry();

  // 1. Explicit reroute hint from skill
  if (signals.next_action_hint === 'reroute' && signals.suggested_skill_id) {
    const targetSkill = registry.skills.find(s => s.skill_id === signals.suggested_skill_id);
    if (targetSkill) {
      return {
        action: 'reroute',
        next_skill_id: signals.suggested_skill_id,
        reason: `스킬이 ${signals.suggested_skill_id}로 재라우팅 요청`,
      };
    }
  }

  // 2. Knowledge gap detected - route to search or general chat
  if (signals.knowledge_gap === true) {
    if (currentSkillId === 'paper_explain') {
      return {
        action: 'reroute',
        next_skill_id: 'paper_search',
        reason: '논문 설명 중 지식 갭 발생, 추가 검색 필요',
      };
    }

    if (currentSkillId === 'general_chat') {
      return {
        action: 'reroute',
        next_skill_id: 'paper_search',
        reason: '일반 대화 중 관련 논문 검색 필요',
      };
    }
  }

  // 3. Low coverage or confidence handling
  if (signals.coverage === 'none' || (signals.coverage === 'partial' && signals.confidence === 'low')) {
    // From search - maybe try different approach
    if (currentSkillId === 'paper_search') {
      return {
        action: 'stop', // Let user refine query
        next_skill_id: null,
        reason: '검색 결과 부족, 사용자 쿼리 수정 필요',
      };
    }

    // From paper_explain - need more context
    if (currentSkillId === 'paper_explain') {
      return {
        action: 'stop',
        next_skill_id: null,
        reason: '논문 정보 부족, 추가 정보 필요',
      };
    }

    // From recommend - need more reading history
    if (currentSkillId === 'recommend_next') {
      return {
        action: 'reroute',
        next_skill_id: 'paper_search',
        reason: '추천을 위한 정보 부족, 검색으로 전환',
      };
    }
  }

  // 4. Survey complete - suggest next actions
  if (currentSkillId === 'survey_complete') {
    if (signals.recommendations_count && signals.recommendations_count > 0) {
      return {
        action: 'stop',
        next_skill_id: null,
        reason: '설문 완료 및 추천 제공, 사용자 선택 대기',
      };
    }

    return {
      action: 'reroute',
      next_skill_id: 'recommend_next',
      reason: '설문 완료 후 추천 스킬로 전환',
    };
  }

  // 5. Explanation complete - suggest survey or next paper
  if (currentSkillId === 'paper_explain' && signals.explanation_complete === true) {
    return {
      action: 'stop',
      next_skill_id: null,
      reason: '논문 설명 완료, 사용자 행동 대기',
    };
  }

  // 6. Intent not clarified - ask for clarification
  if (signals.intent_clarified === false) {
    return {
      action: 'stop',
      next_skill_id: null,
      reason: '의도 파악 필요, 추가 질문 대기',
    };
  }

  // 7. Default: stop and wait for user input
  return {
    action: 'stop',
    next_skill_id: null,
    reason: `coverage=${signals.coverage}, confidence=${signals.confidence}로 완료`,
  };
}

/**
 * Check if a skill chain should continue
 */
export function shouldContinueChain(
  signals: ExecutionSignals,
  currentSkillId: string,
  chainDepth: number = 0
): boolean {
  // Prevent infinite loops
  const MAX_CHAIN_DEPTH = 3;
  if (chainDepth >= MAX_CHAIN_DEPTH) {
    console.warn('[PostOrchestrator] Max chain depth reached, stopping');
    return false;
  }

  // Explicit stop
  if (signals.next_action_hint === 'stop') {
    return false;
  }

  // Explicit reroute with target
  if (signals.next_action_hint === 'reroute' && signals.suggested_skill_id) {
    return true;
  }

  // Coverage/confidence based continuation
  if (signals.coverage === 'none' && signals.confidence === 'low') {
    // Might need to try a different approach
    return true;
  }

  return false;
}

/**
 * Get suggested follow-up skills based on current skill and signals
 */
export function getSuggestedFollowUps(
  currentSkillId: string,
  signals: ExecutionSignals
): string[] {
  const suggestions: string[] = [];

  switch (currentSkillId) {
    case 'greeting':
      suggestions.push('paper_search', 'recommend_next');
      break;

    case 'paper_search':
      if (signals.search_result_count && signals.search_result_count > 0) {
        suggestions.push('paper_explain');
      }
      suggestions.push('recommend_next');
      break;

    case 'paper_explain':
      suggestions.push('recommend_next', 'paper_search');
      break;

    case 'survey_complete':
      suggestions.push('recommend_next', 'paper_search');
      break;

    case 'recommend_next':
      suggestions.push('paper_explain', 'paper_search');
      break;

    case 'general_chat':
      suggestions.push('paper_search', 'recommend_next');
      break;
  }

  return suggestions;
}
