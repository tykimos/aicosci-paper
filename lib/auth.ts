import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { Admin } from '@/types/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-at-least-32-chars';
const ADMIN_COOKIE_NAME = 'admin_token';
const TOKEN_EXPIRY = '7d';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token management
export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: string;
}

export function generateToken(admin: Admin): string {
  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    } as AdminTokenPayload,
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

// Cookie management
export async function setAdminCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function getAdminCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value;
}

export async function removeAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

// Get current admin from cookie
export async function getCurrentAdmin(): Promise<AdminTokenPayload | null> {
  const token = await getAdminCookie();
  if (!token) return null;
  return verifyToken(token);
}
