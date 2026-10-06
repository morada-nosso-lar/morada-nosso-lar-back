/**
 * ==============================================================================
 * MIDDLEWARE DO NEXT.JS (src/middleware.ts)
 * ==============================================================================
 * 
 * OBJETIVO:
 * 1. Gerenciar o CORS de forma dinâmica (permitindo localhost e Vercel).
 * 2. Proteger rotas privadas interceptando requisições sem autenticação.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/session';

// Rotas que exigem autenticação obrigatória
const protectedRoutes = ['/dashboard', '/perfil', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';

  // 1. Configuração dinâmica de CORS para aceitar Localhost e Produção
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://morada-nosso-lar-front.vercel.app',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean);

  const isAllowedOrigin = allowedOrigins.includes(origin);
  const corsOrigin = isAllowedOrigin ? origin : 'https://morada-nosso-lar-front.vercel.app';

  // 2. Se for uma requisição OPTIONS (Preflight do CORS), responde imediatamente
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      },
    });
  }

  // 3. Verificação de Rotas Protegidas
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      // Para requisições de API protegidas, retorna JSON 401
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.json(
          { success: false, error: 'Acesso negado. Faça login para continuar.' },
          { status: 401 }
        );
        response.headers.set('Access-Control-Allow-Origin', corsOrigin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        return response;
      }

      // Para páginas web normais, redireciona para a página de login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Prossegue a requisição injetando os cabeçalhos de CORS necessários
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', corsOrigin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  return response;
}

/**
 * Configuração de Matcher para especificar onde o middleware deve ser executado
 */
export const config = {
  matcher: [
    /*
     * Aplica em todas as rotas exceto arquivos estáticos (_next/static, favicon, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};