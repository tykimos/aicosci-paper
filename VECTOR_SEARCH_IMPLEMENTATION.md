# Vector Search System Implementation

This document describes the vector search system implementation for semantic paper search.

## Files Created

### 1. `/lib/embeddings/azure-embeddings.ts`

Azure OpenAI embedding service with the following functions:

- `createEmbedding(text: string): Promise<number[]>` - Create embedding for a single text
- `createEmbeddings(texts: string[]): Promise<number[][]>` - Create embeddings for multiple texts (batch processing)
- `getEmbeddingDimension(): number` - Get embedding dimension (1536)

**Environment Variables Required:**
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `AZURE_EMBEDDING_DEPLOYMENT` - Deployment name (default: text-embedding-3-small)
- `AZURE_EMBEDDING_API_VERSION` - API version (default: 2023-05-15)

### 2. `/app/api/v1/search/vector/route.ts`

POST endpoint for vector search with the following features:

**Request Interface:**
```typescript
{
  query: string;        // Search query
  topK?: number;        // Number of results (default: 10, max: 50)
  threshold?: number;   // Similarity threshold (default: 0.7, range: 0-1)
  paperId?: string;     // Optional: search within specific paper
}
```

**Response:**
```typescript
{
  query: string;
  results: PaperScore[];
  count: number;
  params: { topK, threshold, paperId }
}
```

**Implementation Steps:**
1. Generate embedding for query using Azure OpenAI
2. Call `match_paper_chunks` Supabase function
3. Filter by paperId if specified
4. Group chunks by paper_id and aggregate scores
5. Fetch paper metadata
6. Calculate weighted scores (70% max similarity + 30% average similarity)
7. Return top K results with matched chunks

### 3. `/lib/search/hybrid-search.ts`

Hybrid search combining vector and keyword search using Reciprocal Rank Fusion (RRF).

**Main Function:**
```typescript
hybridSearch(query: string, options?: HybridSearchOptions): Promise<SearchResult[]>
```

**Options:**
- `topK` - Number of results (default: 10)
- `paperId` - Search within specific paper
- `threshold` - Vector similarity threshold (default: 0.7)
- `vectorWeight` - Weight for vector search (default: 0.6)
- `keywordWeight` - Weight for keyword search (default: 0.4)

**Helper Functions:**
- `vectorOnlySearch()` - Search using only vector similarity
- `keywordOnlySearch()` - Search using only keyword matching

**Algorithm:**
1. Execute vector and keyword searches in parallel
2. Apply Reciprocal Rank Fusion (RRF) to combine results
3. Fetch paper metadata for all matched papers
4. Calculate final scores and return top K results

## Database Schema

The system uses the `paper_chunks` table created by `supabase-vector.sql`:

```sql
CREATE TABLE paper_chunks (
  id UUID PRIMARY KEY,
  paper_id UUID REFERENCES papers(id),
  chunk_index INTEGER,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

And the `match_paper_chunks` function:

```sql
CREATE FUNCTION match_paper_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
```

## Usage Examples

### Vector Search API

```bash
curl -X POST http://localhost:3000/api/v1/search/vector \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning applications in healthcare",
    "topK": 10,
    "threshold": 0.75
  }'
```

### Hybrid Search (Server-side)

```typescript
import { hybridSearch } from '@/lib/search/hybrid-search';

const results = await hybridSearch('neural networks', {
  topK: 10,
  threshold: 0.7,
  vectorWeight: 0.6,
  keywordWeight: 0.4
});
```

## Environment Setup

Add these variables to `.env.local`:

```env
# Azure OpenAI (for embeddings)
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_EMBEDDING_API_VERSION=2023-05-15
```

## Testing

The system integrates with the existing paper import script (`scripts/import-papers.ts`) which already creates embeddings for paper chunks.

To test:
1. Ensure papers are imported with embeddings
2. Use the vector search API endpoint
3. Or use the hybrid search function in server-side code

## Performance Considerations

- Batch size for embeddings: 16 texts per request
- Rate limiting: 200ms between batches
- Vector search match count: topK * 5 (to ensure enough results after aggregation)
- IVFFlat index for fast similarity search

## Type Safety

The system includes proper TypeScript types for:
- Database schema (extended `types/database.ts`)
- API requests and responses
- Search results and options
