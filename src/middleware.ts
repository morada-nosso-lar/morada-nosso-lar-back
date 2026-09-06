/**
 * ==============================================================================
 * MIDDLEWARE DE AUTENTICAÇÃO DO NEXT.JS (src/middleware.ts)
 * ==============================================================================
 * 
 * O QUE É O MIDDLEWARE DO NEXT.JS?
 * O middleware é executado ANTES de qualquer requisição ser completada.
 * Ele permite interceptar requisições, verificar cookies/headers e redirecionar
 * ou bloquear o acesso a rotas privadas.
 * 
 * NOTA SOBRE EDGE RUNTIME:
 * O middleware do Next.js roda no ambiente Edge. 
 * Para verificar tokens aqui sem bibliotecas pesadas de Node.js, verificamos
 * a presença do cookie ou usamos utilitários leves como 'jose' se necessário.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/session';

// Rotas que exigem autenticação obrigatória
const protectedRoutes = ['/dashboard', '/perfil', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica se a rota atual faz parte das rotas protegidas
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    // Se não houver token no cookie, bloqueia ou redireciona
    if (!token) {
      // Para requisições de API, retorna JSON 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Acesso negado. Faça login para continuar.' },
          { status: 401 }
        );
      }

      // Para páginas web normais, redirecionaria para a página de login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
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
