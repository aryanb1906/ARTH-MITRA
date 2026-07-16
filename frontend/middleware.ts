import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Demo bypass token
const DEMO_TOKEN = process.env.DEMO_ACCESS_TOKEN;

// Routes that require authentication
const protectedRoutes = ['/settings'];

// Routes that should redirect to /chat if already logged in
const authRoutes = ['/login', '/register'];

// Routes that do NOT require authentication (open to all)
const publicRoutes = ['/profile-setup'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('auth-token')?.value;
  const demoSession = req.cookies.get('demo-session')?.value;

  // Check for demo bypass via URL token (first hit only) - strip it from the
  // URL and hand out a short-lived cookie so the raw token doesn't have to
  // stay in the address bar/history/logs for every subsequent navigation.
  const demoParam = req.nextUrl.searchParams.get('demo');
  if (DEMO_TOKEN && demoParam === DEMO_TOKEN) {
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete('demo');
    const response = NextResponse.redirect(cleanUrl);
    response.headers.set(
      'Set-Cookie',
      `demo-session=${DEMO_TOKEN}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
    return response;
  }

  const isAuthenticated = !!token || (!!DEMO_TOKEN && demoSession === DEMO_TOKEN);

  // Protect routes
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth routes
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/chat', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
