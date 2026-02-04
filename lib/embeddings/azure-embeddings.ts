import { AzureOpenAI } from 'openai';

// Azure OpenAI configuration
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';
const AZURE_EMBEDDING_API_VERSION = process.env.AZURE_EMBEDDING_API_VERSION || '2023-05-15';

// Initialize Azure OpenAI client
let azureOpenAI: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (!azureOpenAI) {
    if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
      throw new Error('Missing Azure OpenAI credentials: AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are required');
    }

    azureOpenAI = new AzureOpenAI({
      endpoint: AZURE_ENDPOINT,
      apiKey: AZURE_API_KEY,
      apiVersion: AZURE_EMBEDDING_API_VERSION,
    });
  }

  return azureOpenAI;
}

/**
 * Create embedding for a single text
 * @param text - Text to embed
 * @returns Embedding vector (1536 dimensions for text-embedding-3-small)
 */
export async function createEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  const client = getClient();

  try {
    const response = await client.embeddings.create({
      model: AZURE_EMBEDDING_DEPLOYMENT,
      input: text,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding returned from Azure OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw new Error(`Failed to create embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Filter out empty texts
  const validTexts = texts.filter(t => t && t.trim().length > 0);

  if (validTexts.length === 0) {
    return [];
  }

  const client = getClient();
  const embeddings: number[][] = [];

  // Process in batches of 16 (Azure OpenAI batch limit)
  const BATCH_SIZE = 16;

  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE);

    try {
      const response = await client.embeddings.create({
        model: AZURE_EMBEDDING_DEPLOYMENT,
        input: batch,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embeddings returned from Azure OpenAI');
      }

      // Sort by index to maintain order
      const sortedData = response.data.sort((a, b) => a.index - b.index);

      for (const item of sortedData) {
        embeddings.push(item.embedding);
      }
    } catch (error) {
      console.error(`Error creating embeddings for batch ${i}:`, error);
      throw new Error(`Failed to create embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Rate limiting: wait 200ms between batches
    if (i + BATCH_SIZE < validTexts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return embeddings;
}

/**
 * Get embedding dimension for the configured model
 * @returns Embedding dimension (1536 for text-embedding-3-small/ada-002)
 */
export function getEmbeddingDimension(): number {
  // text-embedding-3-small and text-embedding-ada-002 both use 1536 dimensions
  return 1536;
}
