-- Papers table
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  authors TEXT[] DEFAULT '{}',
  abstract TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'docx', 'doc')),
  tags TEXT[] DEFAULT '{}',
  vote_count INTEGER DEFAULT 0,
  survey_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1',
  paper_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anonymous sessions table
CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paper_id, session_id)
);

-- Survey questions table
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('radio', 'checkbox', 'text', 'scale')),
  options JSONB,
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Surveys table
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  responses JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public read policies for papers and tags
CREATE POLICY "Public read papers" ON papers FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Public read tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Public read survey_questions" ON survey_questions FOR SELECT USING (true);

-- Session policies
CREATE POLICY "Create own session" ON anonymous_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Read own session" ON anonymous_sessions FOR SELECT USING (true);
CREATE POLICY "Update own session" ON anonymous_sessions FOR UPDATE USING (true);

-- Vote policies
CREATE POLICY "Create vote" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Read votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Delete own vote" ON votes FOR DELETE USING (true);

-- Survey policies
CREATE POLICY "Create survey" ON surveys FOR INSERT WITH CHECK (true);
CREATE POLICY "Read surveys" ON surveys FOR SELECT USING (true);
