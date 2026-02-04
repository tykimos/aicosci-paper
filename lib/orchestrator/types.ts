/**
 * Types for the Chat Orchestrator System
 */

// Skill Registry Types
export interface SkillBudget {
  context_tokens: number;
  history_turns: number;
  search_topk?: number;
  candidates_topk?: number;
}

export interface SkillDefinition {
  skill_id: string;
  description: string;
  triggers: string[];
  requires: string[];
  budget: SkillBudget;
}

export interface SkillRegistry {
  skills: SkillDefinition[];
}

// Execution Signals
export interface ExecutionSignals {
  coverage: 'enough' | 'partial' | 'none';
  confidence: 'high' | 'medium' | 'low';
  next_action_hint: 'stop' | 'reroute';
  suggested_skill_id?: string;

  // Optional signals based on skill
  knowledge_gap?: boolean;
  gap_reason?: string;
  explanation_complete?: boolean;
  intent_clarified?: boolean;
  recommendations_count?: number;
  search_result_count?: number;
  user_understanding?: 'high' | 'medium' | 'low';
  diversity_score?: 'high' | 'medium' | 'low';
}

// Pre-Orchestrator Output
export interface PreOrchestratorOutput {
  skill_id: string;
  requires: string[];
  query: string | null;
  reason: string;
}

// Post-Orchestrator Output
export interface PostOrchestratorOutput {
  action: 'stop' | 'reroute';
  next_skill_id: string | null;
  reason: string;
}

// Execution Result
export interface ExecutionResult {
  content: string;
  rawResponse: string;
  signals: ExecutionSignals;
  promptButtons?: string[];
}

// Context Types
export interface UserContext {
  session_id: string;
  is_first_visit: boolean;
  visit_count: number;
  user_name?: string;
  preferred_language: string;
  reading_history?: string[];
  survey_history?: string[];
}

export interface PaperContext {
  paper_id: string;
  title: string;
  authors: string[];
  abstract?: string;
  tags?: string[];
  chunks?: string[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

// Additional Data for Context Building
export interface AdditionalContextData {
  paper?: PaperContext;
  search_results?: SearchResult[];
  survey_responses?: SurveyResponse[];
  conversation_summary?: string;
  previous_signals?: ExecutionSignals;
  previous_response?: string;
}

export interface SearchResult {
  paper_id: string;
  title: string;
  authors: string[];
  score: number;
  snippet?: string;
}

export interface SurveyResponse {
  question_id: string;
  answer: string | number | string[];
}

// Trigger Events
export type TriggerEvent =
  | 'site_enter'
  | 'first_visit'
  | 'search_query'
  | 'user_question'
  | 'paper_select'
  | 'paper_open'
  | 'explain_request'
  | 'survey_submitted'
  | 'paper_read_complete'
  | 'ask_recommendation'
  | 'default';

// Chat Request/Response Types
export interface ChatRequest {
  message?: string;
  trigger?: TriggerEvent;
  session_id: string;
  history?: ConversationMessage[];
  user_context?: Partial<UserContext>;
  paper_context?: PaperContext;
  additional_data?: AdditionalContextData;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    message: string;
    skill_id: string;
    signals: ExecutionSignals;
    prompt_buttons?: string[];
    search_results?: SearchResult[];
    recommended_papers?: SearchResult[];
  };
  error?: {
    code: string;
    message: string;
  };
}

// Streaming Types
export interface StreamChunk {
  type: 'content' | 'signals' | 'buttons' | 'done' | 'error';
  data: string | ExecutionSignals | string[] | { message: string };
}
