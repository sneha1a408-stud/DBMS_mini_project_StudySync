import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Public paths — always accessible
  const publicPaths = ['/', '/login', '/register', '/api/auth'];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    // If logged-in user visits /login or /register, redirect to their dashboard
    if (token && (pathname === '/login' || pathname === '/register')) {
      const dest = token.role === 'coordinator' ? '/coordinator/dashboard' : '/student/dashboard';
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated users → login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access control
  if (pathname.startsWith('/coordinator') && token.role !== 'coordinator') {
    return NextResponse.redirect(new URL('/student/dashboard', req.url));
  }
  if (pathname.startsWith('/student') && token.role !== 'student') {
    return NextResponse.redirect(new URL('/coordinator/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
