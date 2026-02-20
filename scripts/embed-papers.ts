import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { AzureOpenAI } from 'openai';

const pdfParse = require('pdf-parse');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';
const AZURE_EMBEDDING_API_VERSION = process.env.AZURE_EMBEDDING_API_VERSION || '2023-05-15';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const azureOpenAI = new AzureOpenAI({
  endpoint: AZURE_ENDPOINT,
  apiKey: AZURE_API_KEY,
  apiVersion: AZURE_EMBEDDING_API_VERSION,
});

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + CHUNK_SIZE / 2) {
        end = breakPoint + 1;
      }
    }
    const chunk = text.substring(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function createEmbeddings(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  const BATCH_SIZE = 16;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    try {
      const response = await azureOpenAI.embeddings.create({
        model: AZURE_EMBEDDING_DEPLOYMENT,
        input: batch,
      });
      const sorted = response.data.sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        embeddings.push(item.embedding);
      }
    } catch (error) {
      console.error(`  Embedding error for batch ${i}:`, error);
      for (let j = 0; j < batch.length; j++) {
        embeddings.push([]);
      }
    }
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  return embeddings;
}

async function main() {
  console.log('=== Embed Papers Script ===');
  console.log('Keeps existing paper IDs, creates chunks + embeddings only\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }
  if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
    console.error('Missing Azure OpenAI credentials');
    process.exit(1);
  }

  // 1. Fetch all papers from DB
  const { data: papers, error } = await supabase
    .from('papers')
    .select('id, title, file_url')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error || !papers) {
    console.error('Error fetching papers:', error?.message);
    process.exit(1);
  }

  console.log(`Found ${papers.length} papers in DB\n`);

  // 2. Check which papers already have chunks
  const { data: existingChunks } = await supabase
    .from('paper_chunks')
    .select('paper_id');

  const papersWithChunks = new Set((existingChunks || []).map(c => c.paper_id));
  const papersToProcess = papers.filter(p => !papersWithChunks.has(p.id));

  console.log(`Papers already embedded: ${papersWithChunks.size}`);
  console.log(`Papers to process: ${papersToProcess.length}\n`);

  if (papersToProcess.length === 0) {
    console.log('All papers already have embeddings!');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  let totalChunks = 0;

  for (const paper of papersToProcess) {
    const fileUrl = paper.file_url; // e.g. /data/001.pdf
    if (!fileUrl) {
      console.log(`[SKIP] ${paper.title?.substring(0, 40)} - no file_url`);
      errorCount++;
      continue;
    }

    // Resolve PDF path: try public/data first, then data/
    const filename = path.basename(fileUrl);
    let pdfPath = path.join(process.cwd(), 'public', 'data', filename);
    if (!fs.existsSync(pdfPath)) {
      pdfPath = path.join(process.cwd(), 'data', filename);
    }
    if (!fs.existsSync(pdfPath)) {
      console.log(`[SKIP] ${filename} - PDF not found`);
      errorCount++;
      continue;
    }

    console.log(`[${successCount + errorCount + 1}/${papersToProcess.length}] ${filename} - ${paper.title?.substring(0, 50)}...`);

    try {
      // Parse PDF
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;

      if (!text || text.length < 100) {
        console.log('  SKIP: insufficient text');
        errorCount++;
        continue;
      }

      // Chunk
      const chunks = chunkText(text);
      console.log(`  ${chunks.length} chunks, creating embeddings...`);

      // Embed
      const embeddings = await createEmbeddings(chunks);

      // Build records
      const records = chunks
        .map((content, index) => ({
          paper_id: paper.id,
          chunk_index: index,
          content,
          embedding: embeddings[index]?.length > 0 ? embeddings[index] : null,
          metadata: { page_estimate: Math.floor(index / 3) + 1 },
        }))
        .filter(r => r.embedding !== null);

      // Insert in batches
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error: insertError } = await supabase
          .from('paper_chunks')
          .insert(batch);
        if (insertError) {
          console.error(`  Insert error: ${insertError.message}`);
        }
      }

      console.log(`  OK: ${records.length} chunks inserted`);
      successCount++;
      totalChunks += records.length;
    } catch (err) {
      console.error(`  ERROR:`, err);
      errorCount++;
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Success: ${successCount} papers, ${totalChunks} chunks`);
  console.log(`Errors/Skipped: ${errorCount}`);
}

main().catch(console.error);
