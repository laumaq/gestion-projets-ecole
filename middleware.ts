import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Vérifier si l'utilisateur est connecté
  const isAuthenticated = request.cookies.get('auth-token') || 
    (typeof window !== 'undefined' && localStorage.getItem('userId'));

  // Rediriger vers la page de connexion si non authentifié
  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Rediriger vers le dashboard si déjà connecté
  if (isAuthenticated && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
