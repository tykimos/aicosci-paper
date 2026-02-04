import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if accessing admin routes (except login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Note: For full JWT verification, we'd need to verify the token here.
    // For now, we just check if the token exists.
    // Full verification happens in API routes.
  }

  // Redirect /admin/login if already logged in
  if (pathname === '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (token) {
      const adminUrl = new URL('/admin', request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
