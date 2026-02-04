-- Papers 테이블
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  abstract TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'doc')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  vote_count INTEGER NOT NULL DEFAULT 0,
  survey_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Tags 테이블
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  paper_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anonymous Sessions 테이블
CREATE TABLE anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes 테이블
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(paper_id, session_id)
);

-- Survey Questions 테이블
CREATE TABLE survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('radio', 'checkbox', 'text', 'scale')),
  options JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Surveys 테이블
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '[]',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(paper_id, session_id)
);

-- Admins 테이블
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')) DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Site Settings 테이블
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_papers_tags ON papers USING GIN (tags);
CREATE INDEX idx_papers_created_at ON papers (created_at DESC);
CREATE INDEX idx_papers_deleted_at ON papers (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_votes_paper_id ON votes (paper_id);
CREATE INDEX idx_votes_session_id ON votes (session_id);
CREATE INDEX idx_surveys_paper_id ON surveys (paper_id);
CREATE INDEX idx_surveys_session_id ON surveys (session_id);
CREATE INDEX idx_survey_questions_order ON survey_questions (order_index);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER papers_updated_at
  BEFORE UPDATE ON papers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update vote_count function
CREATE OR REPLACE FUNCTION update_paper_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE papers
    SET vote_count = vote_count + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END
    WHERE id = NEW.paper_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE papers
    SET vote_count = vote_count - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END
    WHERE id = OLD.paper_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type != NEW.vote_type THEN
      UPDATE papers
      SET vote_count = vote_count + CASE WHEN NEW.vote_type = 'up' THEN 2 ELSE -2 END
      WHERE id = NEW.paper_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER votes_update_count
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_paper_vote_count();

-- Update survey_count function
CREATE OR REPLACE FUNCTION update_paper_survey_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE papers SET survey_count = survey_count + 1 WHERE id = NEW.paper_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE papers SET survey_count = survey_count - 1 WHERE id = OLD.paper_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER surveys_update_count
  AFTER INSERT OR DELETE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_paper_survey_count();

-- Update tag paper_count function
CREATE OR REPLACE FUNCTION update_tag_paper_count()
RETURNS TRIGGER AS $$
DECLARE
  tag_name TEXT;
BEGIN
  -- Handle removed tags
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    FOREACH tag_name IN ARRAY COALESCE(OLD.tags, '{}')
    LOOP
      IF TG_OP = 'DELETE' OR NOT (tag_name = ANY(COALESCE(NEW.tags, '{}'))) THEN
        UPDATE tags SET paper_count = paper_count - 1 WHERE name = tag_name;
      END IF;
    END LOOP;
  END IF;

  -- Handle added tags
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    FOREACH tag_name IN ARRAY COALESCE(NEW.tags, '{}')
    LOOP
      IF TG_OP = 'INSERT' OR NOT (tag_name = ANY(COALESCE(OLD.tags, '{}'))) THEN
        INSERT INTO tags (name, paper_count)
        VALUES (tag_name, 1)
        ON CONFLICT (name) DO UPDATE SET paper_count = tags.paper_count + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER papers_update_tag_count
  AFTER INSERT OR UPDATE OF tags OR DELETE ON papers
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_paper_count();

-- Insert default survey questions
INSERT INTO survey_questions (question_text, question_type, options, order_index, is_required) VALUES
  ('논문의 신뢰성은 어떻습니까?', 'radio', '[{"value": "very_high", "label": "매우 높음"}, {"value": "high", "label": "높음"}, {"value": "medium", "label": "보통"}, {"value": "low", "label": "낮음"}]', 1, true),
  ('연구 방법론은 적절합니까?', 'radio', '[{"value": "very_appropriate", "label": "매우 적절"}, {"value": "appropriate", "label": "적절"}, {"value": "medium", "label": "보통"}, {"value": "inappropriate", "label": "부적절"}]', 2, true),
  ('연구 결과의 실용성은 어떻습니까?', 'radio', '[{"value": "very_high", "label": "매우 높음"}, {"value": "high", "label": "높음"}, {"value": "medium", "label": "보통"}, {"value": "low", "label": "낮음"}]', 3, true);
