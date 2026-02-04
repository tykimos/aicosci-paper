import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  successResponse,
  badRequestResponse,
  errorResponse,
  internalErrorResponse,
} from '@/lib/api/response';
import { verifyPassword, generateToken, setAdminCookie } from '@/lib/auth';
import type { AdminRow } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequestResponse('Email and password are required');
    }

    const supabase = await createClient();

    // Find admin by email
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .single() as { data: AdminRow | null; error: unknown };

    if (error || !admin) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, admin.password_hash);
    if (!isValidPassword) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Update last login
    await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<unknown> } } })
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate token and set cookie
    const token = generateToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      created_at: admin.created_at,
      last_login_at: admin.last_login_at,
    });

    await setAdminCookie(token);

    return successResponse({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return internalErrorResponse('Login failed');
  }
}
