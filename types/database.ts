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
    };
  };
}
