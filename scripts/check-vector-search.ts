import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkFunction() {
  // Check if the function exists
  const { data, error } = await supabase
    .rpc('match_paper_chunks', {
      query_embedding: JSON.stringify(new Array(1536).fill(0.1)),
      match_threshold: 0.3,
      match_count: 5
    });

  if (error) {
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    console.log('Details:', error.details);
  } else {
    console.log('Function exists! Results:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('Sample result:', data[0].paper_id, data[0].similarity);
    }
  }
}

checkFunction();
