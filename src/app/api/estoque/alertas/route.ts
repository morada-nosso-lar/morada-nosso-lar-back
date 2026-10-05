/**
 * ==============================================================================
 * API ROUTE: ALERTAS DE ESTOQUE — LISTAGEM
 * (src/app/api/estoque/alertas/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET /api/estoque/alertas → Lista o histórico de alertas de estoque baixo
 *
 * AUTENTICAÇÃO:
 *   Exige autenticação via JWT (cookie httpOnly ou header Bearer).
 *
 * QUERY PARAMS (opcionais):
 *   ?lido=true    → Filtra apenas alertas já lidos
 *   ?lido=false   → Filtra apenas alertas não lidos (pendentes)
 *   (sem filtro)  → Retorna todos os alertas
 *
 * DESCRIÇÃO:
 *   Este endpoint retorna o histórico completo de alertas de estoque baixo.
 *   Os alertas são gerados automaticamente quando um produto é cadastrado
 *   ou atualizado com quantidade ≤ 2 unidades.
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidade AlertaEstoque).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { getDataSource } from '@/lib/database/data-source';
import { AlertaEstoque } from '@/lib/database/entities/AlertaEstoque';

/**
 * GET /api/estoque/alertas
 *
 * Retorna o histórico de alertas de estoque baixo.
 * Aceita filtro opcional via query param `lido` (true/false).
 *
 * Exemplos de uso:
 *   GET /api/estoque/alertas           → Todos os alertas
 *   GET /api/estoque/alertas?lido=false → Apenas alertas pendentes (não lidos)
 *   GET /api/estoque/alertas?lido=true  → Apenas alertas já lidos
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "5 alerta(s) encontrado(s).",
 *   "data": [
 *     {
 *       "id": 1,
 *       "produtoId": 3,
 *       "produtoNome": "Papel Higiênico",
 *       "quantidade": 1,
 *       "mensagem": "⚠️ ALERTA: O produto ...",
 *       "lido": false,
 *       "createdAt": "2026-10-04T23:00:00Z"
 *     },
 *     ...
 *   ]
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

  try {
    // 2. Obtém a conexão com o banco de dados via TypeORM
    const ds = await getDataSource();
    const repo = ds.getRepository(AlertaEstoque);

    // 3. Verifica se há filtro de leitura via query param
    const url = new URL(request.url);
    const lidoParam = url.searchParams.get('lido');

    // 4. Monta a condição de busca (where) baseada no filtro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (lidoParam === 'true') {
      where.lido = true;
    } else if (lidoParam === 'false') {
      where.lido = false;
    }
    // Se lidoParam não for 'true' nem 'false', retorna todos (sem filtro)

    // 5. Busca os alertas ordenados por data de criação (mais recentes primeiro)
    const alertas = await repo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    // 6. Retorna a lista de alertas
    return Response.json({
      success: true,
      message: `${alertas.length} alerta(s) encontrado(s).`,
      data: alertas,
    });
  } catch (error) {
    console.error('[GET /api/estoque/alertas] Erro ao buscar alertas:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar alertas de estoque.' },
      { status: 500 }
    );
  }
}
