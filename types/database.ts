export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  file_url: string;
  file_type: 'pdf' | 'docx' | 'doc';
  tags: string[];
  vote_count: number;
  survey_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  paper_count: number;
  created_at: string;
}

export interface AnonymousSession {
  id: string;
  fingerprint?: string;
  created_at: string;
  last_active_at: string;
}

export interface Vote {
  id: string;
  paper_id: string;
  session_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: 'radio' | 'checkbox' | 'text' | 'scale';
  options?: { value: string; label: string }[];
  order_index: number;
  is_required: boolean;
  created_at: string;
}

export interface Survey {
  id: string;
  paper_id: string;
  session_id: string;
  responses: SurveyResponse[];
  completed_at: string;
}

export interface SurveyResponse {
  question_id: string;
  answer: string | number | string[];
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  created_at: string;
  last_login_at?: string;
}

// Admin with password hash (for DB row)
export interface AdminRow extends Admin {
  password_hash: string;
}

export interface SiteSetting {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

export interface PaperSummary {
  id: string;
  paper_id: string;
  summary: string;
  key_points: string[];
  methodology?: string;
  results?: string;
  conclusion?: string;
  language: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  session_id: string;
  messages: Message[];
  current_skill_id?: string;
  signals?: ExecutionSignals;
  created_at: string;
  updated_at: string;
}

export interface PaperReadProgress {
  id: string;
  session_id: string;
  paper_id: string;
  scroll_percentage: number;
  read_complete: boolean;
  time_spent_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface PaperChunk {
  id: string;
  paper_id: string;
  chunk_index: number;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  papers?: Paper[];
}

export interface ExecutionSignals {
  coverage: 'enough' | 'partial' | 'none';
  confidence: 'high' | 'medium' | 'low';
  search_performed?: boolean;
  papers_found?: number;
  summary_generated?: boolean;
  recommendation_ready?: boolean;
  next_action_hint: 'stop' | 'reroute' | 'wait_user';
  suggested_skill_id?: string;
  prompt_buttons?: string[];
}

export type TriggerEvent =
  | 'site_enter'
  | 'paper_select'
  | 'paper_open'
  | 'paper_read_complete'
  | 'survey_submitted'
  | 'search_query'
  | 'user_message'
  | 'ask_recommendation';

// Database 타입 (Supabase 용)
export interface Database {
  public: {
    Tables: {
      papers: {
        Row: Paper;
        Insert: Omit<Paper, 'id' | 'created_at' | 'updated_at' | 'vote_count' | 'survey_count'>;
        Update: Partial<Omit<Paper, 'id' | 'created_at'>>;
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, 'id' | 'created_at' | 'paper_count'>;
        Update: Partial<Omit<Tag, 'id' | 'created_at'>>;
      };
      anonymous_sessions: {
        Row: AnonymousSession;
        Insert: Omit<AnonymousSession, 'id' | 'created_at' | 'last_active_at'>;
        Update: Partial<Omit<AnonymousSession, 'id' | 'created_at'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: Partial<Omit<Vote, 'id' | 'created_at'>>;
      };
      survey_questions: {
        Row: SurveyQuestion;
        Insert: Omit<SurveyQuestion, 'id' | 'created_at'>;
        Update: Partial<Omit<SurveyQuestion, 'id' | 'created_at'>>;
      };
      surveys: {
        Row: Survey;
        Insert: Omit<Survey, 'id' | 'completed_at'>;
        Update: Partial<Omit<Survey, 'id'>>;
      };
      admins: {
        Row: AdminRow;
        Insert: Omit<AdminRow, 'id' | 'created_at' | 'last_login_at'>;
        Update: Partial<Omit<AdminRow, 'id' | 'created_at'>>;
      };
      site_settings: {
        Row: SiteSetting;
        Insert: Omit<SiteSetting, 'id' | 'updated_at'>;
        Update: Partial<Omit<SiteSetting, 'id'>>;
      };
      paper_summaries: {
        Row: PaperSummary;
        Insert: Omit<PaperSummary, 'id' | 'created_at'>;
        Update: Partial<Omit<PaperSummary, 'id' | 'created_at'>>;
      };
      chat_sessions: {
        Row: ChatSession;
        Insert: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChatSession, 'id' | 'created_at'>>;
      };
      paper_read_progress: {
        Row: PaperReadProgress;
        Insert: Omit<PaperReadProgress, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PaperReadProgress, 'id' | 'created_at'>>;
      };
      paper_chunks: {
        Row: PaperChunk;
        Insert: Omit<PaperChunk, 'id' | 'created_at'>;
        Update: Partial<Omit<PaperChunk, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      match_paper_chunks: {
        Args: {
          query_embedding: string;
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: string;
          paper_id: string;
          chunk_index: number;
          content: string;
          metadata: Record<string, unknown>;
          similarity: number;
        }[];
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
  };
}
