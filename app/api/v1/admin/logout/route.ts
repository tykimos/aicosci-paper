import { successResponse, internalErrorResponse } from '@/lib/api/response';
import { removeAdminCookie } from '@/lib/auth';

export async function POST() {
  try {
    await removeAdminCookie();
    return successResponse({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return internalErrorResponse('Logout failed');
  }
}
