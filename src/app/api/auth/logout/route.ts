/**
 * ==============================================================================
 * ENDPOINT: POST /api/auth/logout
 * ==============================================================================
 * 
 * OBJETIVO:
 * Realizar o encerramento da sessão do usuário, instruindo o navegador a 
 * apagar o cookie HttpOnly contendo o Token JWT.
 * 
 * COMO FUNCIONA:
 * Em arquiteturas stateless com JWT, o servidor não mantém estado em banco.
 * O logout é concluído limpando o cookie no cliente (definindo `maxAge: 0` e `value: ''`).
 */

import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth/session';
import { AuthResponse } from '@/types/auth';

export async function POST(): Promise<NextResponse<AuthResponse>> {
  // Cria a resposta de sucesso
  const response = NextResponse.json<AuthResponse>(
    {
      success: true,
      message: 'Logout realizado com sucesso. Sessão encerrada.',
    },
    { status: 200 }
  );

  // Limpa o cookie HttpOnly no navegador do usuário
  clearAuthCookie(response);

  return response;
}
