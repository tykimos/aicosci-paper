export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    has_more?: boolean;
  };
}

// Error codes
export const ErrorCodes = {
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Session
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Paper
  PAPER_NOT_FOUND: 'PAPER_NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',

  // Vote
  ALREADY_VOTED: 'ALREADY_VOTED',
  VOTE_NOT_FOUND: 'VOTE_NOT_FOUND',

  // Survey
  ALREADY_SURVEYED: 'ALREADY_SURVEYED',
  SURVEY_NOT_FOUND: 'SURVEY_NOT_FOUND',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Paper API types
export interface PapersListParams {
  search?: string;
  tags?: string[];
  sort?: 'newest' | 'votes' | 'surveys';
  page?: number;
  limit?: number;
}

export interface PapersListResponse {
  papers: import('./database').Paper[];
}

// Vote API types
export interface VoteRequest {
  vote_type: 'up' | 'down';
  session_id: string;
}

export interface VoteResponse {
  vote_count: number;
  user_vote: 'up' | 'down' | null;
}

// Survey API types
export interface SurveySubmitRequest {
  session_id: string;
  responses: import('./database').SurveyResponse[];
}

// Admin API types
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  admin: import('./database').Admin;
  token: string;
}

export interface AdminStatsResponse {
  total_papers: number;
  total_surveys: number;
  total_votes: number;
  total_participants: number;
}

export interface DailyStatsResponse {
  date: string;
  surveys: number;
  votes: number;
  participants: number;
}

// Export types
export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportRequest {
  format: ExportFormat;
  paper_id?: string;
  date_from?: string;
  date_to?: string;
}
