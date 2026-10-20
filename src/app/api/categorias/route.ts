/**
 * ==============================================================================
 * API ROUTE: CATEGORIAS — LISTA PRÉ-DEFINIDA
 * (src/app/api/categorias/route.ts)
 * ==============================================================================
 *
 * Endpoint:
 *   GET /api/categorias → Retorna a lista de categorias válidas do sistema
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "O sistema deveria ter uma lista pré-definida de categorias
 *    (remédios; roupas; higiene pessoal....)"
 *   → Este endpoint expõe a lista oficial de categorias para que o frontend
 *   possa popular dropdowns/selects de forma dinâmica.
 *
 * AUTENTICAÇÃO:
 *   Exige autenticação via JWT (cookie httpOnly ou header Bearer).
 *
 * NOTA:
 *   A lista é definida em src/lib/constants/categorias.ts e é a mesma
 *   usada na validação Zod dos produtos de estoque.
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { CATEGORIAS_VALIDAS } from '@/lib/constants/categorias';

/**
 * GET /api/categorias
 *
 * Retorna a lista completa de categorias válidas do sistema.
 * O frontend deve usar esses valores para popular campos de seleção
 * e garantir que apenas categorias válidas sejam enviadas ao cadastrar produtos.
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "10 categoria(s) disponível(is).",
 *   "data": ["Remédios", "Roupas", "Higiene Pessoal", ...]
 * }
 */
export async function GET(request: NextRequest) {
  // 1. Verifica se o usuário está autenticado via JWT
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Retorna a lista de categorias válidas
  return Response.json({
    success: true,
    message: `${CATEGORIAS_VALIDAS.length} categoria(s) disponível(is).`,
    data: CATEGORIAS_VALIDAS,
  });
}
