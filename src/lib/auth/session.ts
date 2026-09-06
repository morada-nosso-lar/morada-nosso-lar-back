/**
 * ==============================================================================
 * GERENCIAMENTO DE SESSÃO E COOKIES (src/lib/auth/session.ts)
 * ==============================================================================
 * 
 * POR QUE USAR COOKIES COM FLAG "HttpOnly"?
 * -----------------------------------------
 * Existem duas formas principais de guardar um token JWT no frontend:
 * 1. LocalStorage / SessionStorage:
 *    - DESVANTAGEM CRÍTICA: O código JavaScript do navegador consegue ler o token.
 *      Se a aplicação tiver uma vulnerabilidade de XSS (Cross-Site Scripting),
 *      um script malicioso pode roubar o token do usuário!
 * 2. Cookies com flag `httpOnly: true`:
 *    - VANTAGEM: O navegador anexa o cookie automaticamente nas requisições HTTP,
 *      mas NENHUM script JavaScript no cliente consegue acessar o cookie.
 *    - Isso bloqueia ataques de roubo de token via XSS.
 * 
 * ATRIBUTOS DE SEGURANÇA DO COOKIE:
 * - `httpOnly`: true -> Impede acesso via document.cookie no JavaScript.
 * - `secure`: true (em produção) -> Envia o cookie APENAS por conexões HTTPS criptografadas.
 * - `sameSite: 'lax'` -> Protege contra ataques CSRF (Cross-Site Request Forgery).
 * - `path: '/'` -> O cookie fica disponível para todas as rotas da aplicação.
 * - `maxAge`: Tempo em segundos até o cookie expirar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import { JWTPayload } from '@/types/auth';

// Nome padrão do cookie de autenticação
export const AUTH_COOKIE_NAME = 'morada_auth_token';

// Tempo de expiração do cookie em segundos (7 dias = 7 * 24 * 60 * 60)
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Anexa o cookie seguro com o JWT na resposta HTTP (NextResponse).
 * 
 * @param response - A resposta HTTP sendo montada
 * @param token - O token JWT a ser armazenado no cookie
 */
export function setAuthCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,                                  // Protege contra XSS
    secure: isProduction,                            // Exige HTTPS em produção
    sameSite: 'lax',                                 // Protege contra CSRF
    path: '/',                                       // Válido em todo o site
    maxAge: COOKIE_MAX_AGE,                          // Tempo de vida em segundos
  });
}

/**
 * Remove o cookie de autenticação na resposta HTTP (usado no Logout).
 * 
 * @param response - A resposta HTTP do logout
 */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,                                       // Expira imediatamente
  });
}

/**
 * Extrai e valida o token JWT a partir de uma requisição Next.js.
 * 
 * Procura o token em duas fontes:
 * 1. Cabeçalho HTTP `Authorization: Bearer <token>` (padrão para clientes Mobile, Postman ou APIs externas).
 * 2. Cookie `morada_auth_token` (padrão para navegadores Web).
 * 
 * @param request - A requisição HTTP recebida (NextRequest)
 * @returns O payload decodificado se autenticado, ou null se não autorizado
 */
export function getAuthenticatedUserFromRequest(request: NextRequest): JWTPayload | null {
  let token: string | undefined;

  // 1. Tenta obter pelo cabeçalho Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove o prefixo "Bearer "
  }

  // 2. Se não veio no header, tenta obter pelo Cookie httpOnly
  if (!token) {
    const cookie = request.cookies.get(AUTH_COOKIE_NAME);
    if (cookie) {
      token = cookie.value;
    }
  }

  // Se nenhum token foi encontrado, retorna null
  if (!token) {
    return null;
  }

  // Valida o token com a nossa chave secreta
  return verifyToken(token);
}
