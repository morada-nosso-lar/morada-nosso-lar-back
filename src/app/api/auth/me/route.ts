/**
 * ==============================================================================
 * ENDPOINT: GET /api/auth/me (ROTA PROTEGIDA)
 * ==============================================================================
 * 
 * OBJETIVO:
 * Recuperar os dados do usuário atualmente autenticado a partir do Token JWT
 * (fornecido via Cookie HttpOnly ou cabeçalho 'Authorization: Bearer <token>').
 * 
 * COMO FUNCIONA A PROTEÇÃO:
 * 1. O utilitário `getAuthenticatedUserFromRequest` lê e valida o JWT.
 * 2. Se o token for inválido, ausente ou expirado, a rota responde 401 Unauthorized.
 * 3. Se o token for válido, buscamos o usuário no banco de dados para garantir
 *    que a conta ainda existe e retornamos suas informações atualizadas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { userRepository, sanitizeUser } from '@/lib/db';
import { AuthResponse, ApiErrorResponse } from '@/types/auth';

export async function GET(request: NextRequest): Promise<NextResponse<AuthResponse | ApiErrorResponse>> {
  try {
    // 1. Extrai e valida o token JWT da requisição (Cookie ou Header)
    const payload = getAuthenticatedUserFromRequest(request);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Não autorizado. Token de autenticação ausente, inválido ou expirado.',
        },
        { status: 401 } // 401 Unauthorized
      );
    }

    // 2. Busca o usuário no banco de dados usando o ID extraído do payload do JWT
    const user = await userRepository.findById(payload.userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuário associado a este token não foi encontrado.',
        },
        { status: 404 } // 404 Not Found
      );
    }

    // 3. Remove a senha do objeto antes de enviar
    const safeUser = sanitizeUser(user);

    return NextResponse.json(
      {
        success: true,
        message: 'Dados do usuário autenticado recuperados com sucesso.',
        user: safeUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Me] Erro interno:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocorreu um erro interno ao processar a verificação de autenticação.',
      },
      { status: 500 }
    );
  }
}
