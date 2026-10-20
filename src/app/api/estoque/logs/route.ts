/**
 * ==============================================================================
 * API ROUTE: LOGS DE ESTOQUE — HISTÓRICO DE AUDITORIA
 * (src/app/api/estoque/logs/route.ts)
 * ==============================================================================
 *
 * Endpoint:
 *   GET /api/estoque/logs → Retorna o histórico de alterações no estoque
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Sempre que falamos em edição em sistemas de estoque também falamos
 *    em criação de LOGs para saber que editou."
 *   → Este endpoint permite consultar todos os LOGs de auditoria gerados
 *   pelo sistema, com filtros opcionais por produto, paciente, ação e usuário.
 *
 * QUERY PARAMS (opcionais):
 *   ?produto_id=5     → Filtra logs de um produto específico
 *   ?paciente_id=3    → Filtra logs relacionados a um paciente
 *   ?acao=CRIACAO      → Filtra por tipo de ação
 *   ?usuario_id=1     → Filtra logs de um usuário específico
 *   ?limite=50        → Limita a quantidade de registros retornados (padrão: 100)
 *
 * AUTENTICAÇÃO:
 *   Exige autenticação via JWT (cookie httpOnly ou header Bearer).
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidade LogEstoque).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { getDataSource } from '@/lib/database/data-source';
import { LogEstoque } from '@/lib/database/entities/LogEstoque';

/**
 * GET /api/estoque/logs
 *
 * Retorna o histórico de alterações realizadas no estoque.
 * Os logs são ordenados por data de criação (mais recentes primeiro).
 *
 * Tipos de ações registradas nos LOGs:
 *   - CRIACAO            → Produto cadastrado pela primeira vez
 *   - ATUALIZACAO_QTD    → Quantidade do produto alterada
 *   - ATUALIZACAO_DADOS  → Dados do produto alterados (nome, categoria, etc.)
 *   - EXCLUSAO           → Produto removido do estoque
 *   - ESTOQUE_ZERADO     → Estoque zerado por desativação de paciente
 *   - ITEM_INICIAL       → Item padrão criado ao cadastrar novo paciente
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "25 log(s) encontrado(s).",
 *   "data": [
 *     {
 *       "id": 1,
 *       "produtoId": 3,
 *       "pacienteId": null,
 *       "usuarioId": 1,
 *       "usuarioNome": "Admin",
 *       "acao": "ATUALIZACAO_QTD",
 *       "campoAlterado": "quantidade",
 *       "valorAnterior": "10",
 *       "valorNovo": "5",
 *       "descricao": "Quantidade do produto \"Papel Higiênico\" alterada de 10 para 5...",
 *       "createdAt": "2026-10-20T20:00:00Z"
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
    const repo = ds.getRepository(LogEstoque);

    // 3. Extrai os filtros dos query params
    const url = new URL(request.url);
    const produtoIdParam = url.searchParams.get('produto_id');
    const pacienteIdParam = url.searchParams.get('paciente_id');
    const acaoParam = url.searchParams.get('acao');
    const usuarioIdParam = url.searchParams.get('usuario_id');
    const limiteParam = url.searchParams.get('limite');

    // 4. Monta a condição de busca (where) baseada nos filtros
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filtro por produto
    if (produtoIdParam) {
      const produtoId = parseInt(produtoIdParam, 10);
      if (!isNaN(produtoId) && produtoId > 0) {
        where.produtoId = produtoId;
      }
    }

    // Filtro por paciente
    if (pacienteIdParam) {
      const pacienteId = parseInt(pacienteIdParam, 10);
      if (!isNaN(pacienteId) && pacienteId > 0) {
        where.pacienteId = pacienteId;
      }
    }

    // Filtro por tipo de ação
    if (acaoParam) {
      where.acao = acaoParam.toUpperCase();
    }

    // Filtro por usuário
    if (usuarioIdParam) {
      const usuarioId = parseInt(usuarioIdParam, 10);
      if (!isNaN(usuarioId) && usuarioId > 0) {
        where.usuarioId = usuarioId;
      }
    }

    // Limite de registros (padrão: 100, máximo: 500)
    let take = 100;
    if (limiteParam) {
      const limite = parseInt(limiteParam, 10);
      if (!isNaN(limite) && limite > 0 && limite <= 500) {
        take = limite;
      }
    }

    // 5. Busca os logs ordenados por data de criação (mais recentes primeiro)
    const logs = await repo.find({
      where,
      order: { createdAt: 'DESC' },
      take,
    });

    // 6. Retorna a lista de logs
    return Response.json({
      success: true,
      message: `${logs.length} log(s) encontrado(s).`,
      data: logs,
    });
  } catch (error) {
    console.error('[GET /api/estoque/logs] Erro ao buscar logs:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar logs de estoque.' },
      { status: 500 }
    );
  }
}
