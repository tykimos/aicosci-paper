import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import type { Tag } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .gt('paper_count', 0)
      .order('paper_count', { ascending: false });

    if (error) {
      console.error('Error fetching tags:', error);
      return internalErrorResponse('Failed to fetch tags');
    }

    return successResponse({ tags: tags as Tag[] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}
