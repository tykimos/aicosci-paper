import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import type { Paper } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: paper, error } = await supabase
      .from('papers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !paper) {
      return notFoundResponse('Paper not found');
    }

    return successResponse({ paper: paper as Paper });
  } catch (error) {
    console.error('Unexpected error:', error);
    return internalErrorResponse('Unexpected error occurred');
  }
}
