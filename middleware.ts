import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pour le moment, nous utilisons localStorage côté client
  // Le middleware ne peut pas accéder à localStorage
  // Nous allons donc simplement rediriger
  
  const path = request.nextUrl.pathname;
  
  // Si l'utilisateur est sur la page de connexion et a déjà un token
  // (géré côté client dans le layout du dashboard)
  
  // Si l'utilisateur essaie d'accéder au dashboard sans être sur la page de connexion
  // Nous laissons le layout dashboard vérifier l'authentification
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
