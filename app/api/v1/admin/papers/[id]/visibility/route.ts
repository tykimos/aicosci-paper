import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, badRequestResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();

    const { id: paperId } = await params;
    const body = await request.json();
    const { hidden } = body;

    if (typeof hidden !== 'boolean') {
      return badRequestResponse('hidden (boolean) is required');
    }

    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('papers')
      .update({ hidden_at: hidden ? new Date().toISOString() : null })
      .eq('id', paperId)
      .select('id, title, hidden_at')
      .single();

    if (error) {
      console.error('Error updating visibility:', error);
      return internalErrorResponse('Failed to update visibility');
    }

    return successResponse({
      id: data.id,
      title: data.title,
      hidden: !!data.hidden_at,
    });
  } catch (error) {
    console.error('Error:', error);
    return internalErrorResponse('Failed to update visibility');
  }
}
