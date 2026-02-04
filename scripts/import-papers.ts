import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { AzureOpenAI } from 'openai';

// Dynamic import for CommonJS module
const pdfParse = require('pdf-parse');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002';
const AZURE_EMBEDDING_API_VERSION = process.env.AZURE_EMBEDDING_API_VERSION || '2023-05-15';

const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks
const DATA_DIR = path.join(process.cwd(), 'data');

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const azureOpenAI = new AzureOpenAI({
  endpoint: AZURE_ENDPOINT,
  apiKey: AZURE_API_KEY,
  apiVersion: AZURE_EMBEDDING_API_VERSION,
});

interface PaperMetadata {
  title: string;
  authors: string[];
  abstract: string;
}

// Extract metadata from PDF text
function extractMetadata(text: string, filename: string): PaperMetadata {
  const lines = text.split('\n').filter(line => line.trim());

  // Try to extract title (usually first non-empty lines)
  let title = lines.slice(0, 3).join(' ').trim();
  if (title.length > 200) {
    title = title.substring(0, 200) + '...';
  }
  if (!title) {
    title = filename.replace('.pdf', '');
  }

  // Try to extract abstract
  let abstract = '';
  const abstractMatch = text.match(/abstract[:\s]*(.{100,1500})/i);
  if (abstractMatch) {
    abstract = abstractMatch[1].trim();
  }

  // Authors are harder to extract reliably, leave empty for manual entry
  const authors: string[] = [];

  return { title, authors, abstract };
}

// Chunk text into smaller pieces
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + CHUNK_SIZE / 2) {
        end = breakPoint + 1;
      }
    }

    const chunk = text.substring(start, end).trim();
    if (chunk.length > 50) { // Skip very small chunks
      chunks.push(chunk);
    }

    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

// Create embeddings for chunks using Azure OpenAI
async function createEmbeddings(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process in batches of 16 (Azure has different limits)
  for (let i = 0; i < chunks.length; i += 16) {
    const batch = chunks.slice(i, i + 16);

    try {
      const response = await azureOpenAI.embeddings.create({
        model: AZURE_EMBEDDING_DEPLOYMENT,
        input: batch,
      });

      for (const item of response.data) {
        embeddings.push(item.embedding);
      }
    } catch (error: unknown) {
      console.error(`  Embedding error for batch ${i}:`, error);
      // Fill with empty arrays for failed batches
      for (let j = 0; j < batch.length; j++) {
        embeddings.push([]);
      }
    }

    // Rate limiting
    if (i + 16 < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return embeddings;
}

// Process a single PDF file
async function processPDF(filepath: string): Promise<void> {
  const filename = path.basename(filepath);
  const fileId = filename.replace('.pdf', '');

  console.log(`Processing: ${filename}`);

  try {
    // Read and parse PDF
    const dataBuffer = fs.readFileSync(filepath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (!text || text.length < 100) {
      console.log(`  Skipping: insufficient text content`);
      return;
    }

    // Extract metadata
    const metadata = extractMetadata(text, filename);

    // Insert paper record
    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .upsert({
        id: fileId,
        title: metadata.title,
        authors: metadata.authors,
        abstract: metadata.abstract,
        file_url: `/data/${filename}`,
        file_type: 'pdf',
        tags: [],
      }, { onConflict: 'id' })
      .select()
      .single();

    if (paperError) {
      console.error(`  Error inserting paper: ${paperError.message}`);
      return;
    }

    console.log(`  Paper inserted: ${paper.id}`);
    console.log(`  Title: ${metadata.title.substring(0, 50)}...`);

    // Chunk text
    const chunks = chunkText(text);
    console.log(`  Created ${chunks.length} chunks`);

    // Create embeddings
    console.log(`  Creating embeddings...`);
    const embeddings = await createEmbeddings(chunks);

    // Delete existing chunks for this paper
    await supabase
      .from('paper_chunks')
      .delete()
      .eq('paper_id', paper.id);

    // Insert chunks with embeddings (skip empty embeddings)
    const chunkRecords = chunks
      .map((content, index) => ({
        paper_id: paper.id,
        chunk_index: index,
        content,
        embedding: embeddings[index]?.length > 0 ? embeddings[index] : null,
        metadata: { page_estimate: Math.floor(index / 3) + 1 },
      }))
      .filter(r => r.embedding !== null);

    // Insert in batches
    for (let i = 0; i < chunkRecords.length; i += 50) {
      const batch = chunkRecords.slice(i, i + 50);
      const { error: chunkError } = await supabase
        .from('paper_chunks')
        .insert(batch);

      if (chunkError) {
        console.error(`  Error inserting chunks: ${chunkError.message}`);
      }
    }

    console.log(`  Inserted ${chunkRecords.length} chunks with embeddings`);

  } catch (error) {
    console.error(`  Error processing ${filename}:`, error);
  }
}

// Main function
async function main() {
  console.log('=== Paper Import Script (Azure OpenAI) ===\n');

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
    console.error('Missing Azure OpenAI credentials');
    process.exit(1);
  }

  // Get all PDF files
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.pdf'))
    .map(f => path.join(DATA_DIR, f));

  console.log(`Found ${files.length} PDF files\n`);

  // Process each file
  for (const file of files) {
    await processPDF(file);
    console.log('');
  }

  console.log('=== Import Complete ===');
}

main().catch(console.error);
