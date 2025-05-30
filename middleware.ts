import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  SECURITY_CONFIG,
  getCSPHeader,
  isProtectedRoute,
  requiresMasterPassword,
  isAuthRoute,
  isPublicRoute
} from './lib/security-config';

// Routes that require authentication
const protectedRoutes = ['/dashboard'];

// Routes that require both authentication AND master password verification
const masterPasswordRoutes = ['/dashboard'];

// Routes that should redirect authenticated users (auth pages)
const authRoutes = ['/auth/login', '/auth/register'];

// Public routes that don't require authentication
const publicRoutes = ['/', '/privacy', '/terms', '/security'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get authentication status from cookies
  const hasAuthCookie = request.cookies.has(SECURITY_CONFIG.COOKIES.AUTH_TOKEN);
  const hasMasterPasswordCookie = request.cookies.has(SECURITY_CONFIG.COOKIES.MASTER_PASSWORD_VERIFIED);
  
  // Check route requirements using centralized config
  const needsAuth = isProtectedRoute(pathname);
  const needsMasterPassword = requiresMasterPassword(pathname);
  const isAuthPage = isAuthRoute(pathname);
  const isPublic = isPublicRoute(pathname);
  
  // Handle protected routes
  if (needsAuth) {
    // Not authenticated at all - redirect to login
    if (!hasAuthCookie) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Authenticated but master password not verified for routes that require it
    if (needsMasterPassword && !hasMasterPasswordCookie) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      loginUrl.searchParams.set('step', 'master-password');
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Handle auth routes - redirect authenticated users away from login/register
  if (isAuthPage && hasAuthCookie && hasMasterPasswordCookie) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
  
  // Create response with security headers
  const response = NextResponse.next();
  
  // Apply all security headers from config
  Object.entries(SECURITY_CONFIG.SECURITY_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  
  // Set Content Security Policy
  response.headers.set('Content-Security-Policy', getCSPHeader());
  
  // Add additional security headers for development
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('X-Development-Mode', 'true');
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 