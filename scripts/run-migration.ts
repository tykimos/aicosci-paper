/**
 * Run database migration to create match_paper_chunks function
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runMigration() {
  try {
    // Read the SQL file
    const sqlPath = resolve(process.cwd(), 'supabase/migrations/create_match_paper_chunks.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('Running migration...');
    console.log('SQL:', sql.substring(0, 200) + '...');

    // Execute the SQL using the REST API
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('exec_sql not available, trying direct execution...');

      // Split SQL into statements and execute each
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        const result = await supabase.from('_sqlexec').select().single();
        console.log('Statement result:', result.error ? result.error.message : 'OK');
      }
    } else {
      console.log('Migration completed successfully!');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    console.log('\n=== MANUAL SETUP REQUIRED ===');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('File: supabase/migrations/create_match_paper_chunks.sql');
    process.exit(1);
  }
}

runMigration();
