import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  internalErrorResponse,
  parsePaginationParams,
  createPaginationMeta,
} from '@/lib/api/response';
import type { Paper } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const { page, limit, offset } = parsePaginationParams(searchParams);
    const search = searchParams.get('search') || '';
    const tags = searchParams.getAll('tags');
    const sort = searchParams.get('sort') || 'newest';

    // Build query
    let query = supabase
      .from('papers')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,authors.cs.{${search}}`);
    }

    // Tags filter
    if (tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    // Sort
    switch (sort) {
      case 'votes':
        query = query.order('vote_count', { ascending: false });
        break;
      case 'surveys':
        query = query.order('survey_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: papers, count, error } = await query;

    if (error) {
      console.error('Error fetching papers:', error);
      return internalErrorResponse('Failed to fetch papers');
    }

    return successResponse(
      { papers: papers as Paper[] },
      createPaginationMeta(page, limit, count || 0)
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}
