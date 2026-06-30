import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define the paths that require authentication
const protectedRoutes = ['/chats', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the current path starts with a protected route
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (isProtected) {
    // We assume the token is stored in a cookie named 'access_token'
    const token = request.cookies.get('access_token');
    
    if (!token) {
      // Redirect to login if no token is found
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Redirect logged-in users away from the login page
  if (pathname === '/login' || pathname === '/') {
    const token = request.cookies.get('access_token');
    if (token) {
      const dashboardUrl = new URL('/chats', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
