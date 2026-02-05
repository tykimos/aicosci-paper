-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the match_paper_chunks function for vector similarity search
CREATE OR REPLACE FUNCTION match_paper_chunks(
  query_embedding TEXT,
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  paper_id UUID,
  chunk_index INT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  embedding_array vector(1536);
BEGIN
  -- Parse the JSON string to vector
  embedding_array := query_embedding::vector(1536);

  RETURN QUERY
  SELECT
    pc.id,
    pc.paper_id,
    pc.chunk_index,
    pc.content,
    pc.metadata,
    1 - (pc.embedding <=> embedding_array) AS similarity
  FROM paper_chunks pc
  WHERE 1 - (pc.embedding <=> embedding_array) > match_threshold
  ORDER BY pc.embedding <=> embedding_array
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION match_paper_chunks(TEXT, FLOAT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION match_paper_chunks(TEXT, FLOAT, INT) TO anon;
GRANT EXECUTE ON FUNCTION match_paper_chunks(TEXT, FLOAT, INT) TO service_role;
