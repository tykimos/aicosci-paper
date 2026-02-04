-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Paper chunks table for RAG
CREATE TABLE IF NOT EXISTS paper_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI ada-002 dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS paper_chunks_embedding_idx
  ON paper_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index for paper_id lookup
CREATE INDEX IF NOT EXISTS paper_chunks_paper_id_idx ON paper_chunks(paper_id);

-- Enable RLS
ALTER TABLE paper_chunks ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public read paper_chunks" ON paper_chunks FOR SELECT USING (true);

-- Function for similarity search
CREATE OR REPLACE FUNCTION match_paper_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  paper_id UUID,
  chunk_index INTEGER,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.paper_id,
    pc.chunk_index,
    pc.content,
    pc.metadata,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM paper_chunks pc
  WHERE 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
