import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const adminPayload = await getCurrentAdmin();

    if (!adminPayload) {
      return unauthorizedResponse('Not authenticated');
    }

    const supabase = await createClient();

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, name, role, created_at, last_login_at')
      .eq('id', adminPayload.adminId)
      .single();

    if (error || !admin) {
      return unauthorizedResponse('Admin not found');
    }

    return successResponse({ admin });
  } catch (error) {
    console.error('Error fetching admin:', error);
    return internalErrorResponse('Failed to fetch admin info');
  }
}
