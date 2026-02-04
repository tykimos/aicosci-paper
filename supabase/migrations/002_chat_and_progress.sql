-- Migration: Chat and Progress Tracking (PRD v2)
-- Description: Add tables for chat sessions, reading progress, and paper summaries

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  current_skill_id TEXT,
  signals JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper Read Progress Table
CREATE TABLE IF NOT EXISTS paper_read_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  scroll_percentage INTEGER DEFAULT 0 CHECK (scroll_percentage >= 0 AND scroll_percentage <= 100),
  read_complete BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, paper_id)
);

-- Paper Summaries Table
CREATE TABLE IF NOT EXISTS paper_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  key_points JSONB,
  methodology TEXT,
  results TEXT,
  conclusion TEXT,
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_read_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Anonymous users can view their own chat sessions"
  ON chat_sessions
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM anonymous_sessions
      WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
    )
  );

CREATE POLICY "Anonymous users can insert their own chat sessions"
  ON chat_sessions
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM anonymous_sessions
      WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
    )
  );

CREATE POLICY "Anonymous users can update their own chat sessions"
  ON chat_sessions
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM anonymous_sessions
      WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
    )
  );

-- RLS Policies for paper_read_progress
CREATE POLICY "Anonymous users can view their own read progress"
  ON paper_read_progress
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM anonymous_sessions
      WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
    )
  );

CREATE POLICY "Anonymous users can insert their own read progress"
  ON paper_read_progress
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM anonymous_sessions
      WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
    )
  );

CREATE POLICY "Anonymous users can update their own read progress"
  ON paper_read_progress
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM anonymous_sessions
      WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token'
    )
  );

-- RLS Policies for paper_summaries (public read, admin write)
CREATE POLICY "Anyone can view paper summaries"
  ON paper_summaries
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can modify paper summaries"
  ON paper_summaries
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Indexes for Performance
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

CREATE INDEX idx_paper_read_progress_session_id ON paper_read_progress(session_id);
CREATE INDEX idx_paper_read_progress_paper_id ON paper_read_progress(paper_id);
CREATE INDEX idx_paper_read_progress_session_paper ON paper_read_progress(session_id, paper_id);

CREATE INDEX idx_paper_summaries_paper_id ON paper_summaries(paper_id);
CREATE INDEX idx_paper_summaries_language ON paper_summaries(language);

-- Trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paper_read_progress_updated_at
  BEFORE UPDATE ON paper_read_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE chat_sessions IS 'Stores conversation history for anonymous sessions';
COMMENT ON TABLE paper_read_progress IS 'Tracks reading progress for papers by session';
COMMENT ON TABLE paper_summaries IS 'Caches AI-generated summaries of papers';

COMMENT ON COLUMN chat_sessions.messages IS 'JSONB array of chat messages with role and content';
COMMENT ON COLUMN chat_sessions.current_skill_id IS 'Current active skill in the conversation';
COMMENT ON COLUMN chat_sessions.signals IS 'JSONB object of detected signals (interest, confusion, etc.)';

COMMENT ON COLUMN paper_read_progress.scroll_percentage IS 'Percentage of paper scrolled (0-100)';
COMMENT ON COLUMN paper_read_progress.read_complete IS 'Whether user completed reading the paper';
COMMENT ON COLUMN paper_read_progress.time_spent_seconds IS 'Total time spent reading in seconds';

COMMENT ON COLUMN paper_summaries.key_points IS 'JSONB array of key points from the paper';
COMMENT ON COLUMN paper_summaries.language IS 'Language of the summary (default: ko for Korean)';
