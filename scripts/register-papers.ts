import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

interface MetaRow {
  no: string;
  title: string;
  subject: string;
  tags: string;
}

function parseMetaCsv(): MetaRow[] {
  const csvPath = path.join(DATA_DIR, 'meta.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(content, {
    columns: false,
    skip_empty_lines: false,
    relax_column_count: true,
    relax_quotes: true,
  });

  // Skip header rows (row 0 is empty, row 1 is header)
  const rows: MetaRow[] = [];
  for (let i = 2; i < records.length; i++) {
    const row = records[i];
    const no = (row[0] || '').toString().trim();
    const title = (row[1] || '').toString().trim();
    const subject = (row[2] || '').toString().trim();
    const tags = (row[3] || '').toString().trim();

    // Skip empty rows
    if (!no || !title) continue;

    // Only process rows 1-126
    const num = parseInt(no, 10);
    if (isNaN(num) || num < 1 || num > 126) continue;

    rows.push({ no: String(num), title, subject, tags });
  }

  return rows;
}

function parseTags(tagString: string): string[] {
  if (!tagString) return [];

  // Split by common delimiters and clean up
  return tagString
    .split(/[,·/\n]/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && t !== '-');
}

async function main() {
  console.log('=== Paper Registration Script ===\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  // 1. Parse meta.csv
  console.log('1. Parsing meta.csv...');
  const metaRows = parseMetaCsv();
  console.log(`   Found ${metaRows.length} papers in meta.csv\n`);

  // 2. Copy PDFs to public/data
  console.log('2. Copying PDFs to public/data...');
  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }

  let copiedCount = 0;
  for (const row of metaRows) {
    const paddedNo = row.no.padStart(3, '0');
    const srcFile = path.join(DATA_DIR, `${paddedNo}.pdf`);
    const destFile = path.join(PUBLIC_DATA_DIR, `${paddedNo}.pdf`);

    if (fs.existsSync(srcFile)) {
      if (!fs.existsSync(destFile)) {
        fs.copyFileSync(srcFile, destFile);
      }
      copiedCount++;
    } else {
      console.log(`   WARNING: ${paddedNo}.pdf not found in data/`);
    }
  }
  console.log(`   Copied ${copiedCount} PDFs\n`);

  // 3. Delete existing papers from DB
  console.log('3. Cleaning existing papers...');
  const { error: deleteChunksError } = await supabase
    .from('paper_chunks')
    .delete()
    .neq('paper_id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (deleteChunksError) {
    console.log(`   Warning: Could not delete chunks: ${deleteChunksError.message}`);
  }

  const { error: deleteSurveysError } = await supabase
    .from('surveys')
    .delete()
    .neq('paper_id', '00000000-0000-0000-0000-000000000000');

  if (deleteSurveysError) {
    console.log(`   Warning: Could not delete surveys: ${deleteSurveysError.message}`);
  }

  const { error: deleteVotesError } = await supabase
    .from('votes')
    .delete()
    .neq('paper_id', '00000000-0000-0000-0000-000000000000');

  if (deleteVotesError) {
    console.log(`   Warning: Could not delete votes: ${deleteVotesError.message}`);
  }

  const { error: deletePapersError } = await supabase
    .from('papers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deletePapersError) {
    console.log(`   Warning: Could not delete papers: ${deletePapersError.message}`);
  }
  console.log('   Done\n');

  // 4. Register papers
  console.log('4. Registering papers in DB...');
  let successCount = 0;
  let errorCount = 0;

  for (const row of metaRows) {
    const paddedNo = row.no.padStart(3, '0');
    const fileUrl = `/data/${paddedNo}.pdf`;
    const tags = parseTags(row.tags);

    // Clean up multi-line titles
    const cleanTitle = row.title.replace(/\s+/g, ' ').trim();
    const cleanSubject = row.subject.replace(/\s+/g, ' ').trim();

    const { error } = await supabase
      .from('papers')
      .insert({
        title: cleanTitle,
        authors: [],
        abstract: cleanSubject,
        file_url: fileUrl,
        file_type: 'pdf',
        tags: tags,
      });

    if (error) {
      console.log(`   ERROR [${paddedNo}]: ${error.message}`);
      errorCount++;
    } else {
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`   Registered ${successCount} papers...`);
      }
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
}

main().catch(console.error);
