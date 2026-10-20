/**
 * ==============================================================================
 * API ROUTE: CONFIGURAÇÃO POR CHAVE — LEITURA E ATUALIZAÇÃO
 * (src/app/api/configuracoes/[chave]/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET /api/configuracoes/:chave → Retorna uma configuração específica
 *   PUT /api/configuracoes/:chave → Atualiza o valor de uma configuração
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Não consegui alterar nenhuma Configuração"
 *   → Este endpoint permite alterar o valor de uma configuração específica.
 *
 * PARÂMETRO DINÂMICO:
 *   [chave] — Chave da configuração (ex: "estoque_minimo", "nome_instituicao").
 *   No Next.js 16+, o `params` é uma Promise que deve ser await.
 *
 * AUTENTICAÇÃO:
 *   Ambos os endpoints exigem autenticação via JWT.
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidade Configuracao).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { getDataSource } from '@/lib/database/data-source';
import { Configuracao } from '@/lib/database/entities/Configuracao';

// Tipo do contexto de rota com parâmetro dinâmico [chave]
type RouteContext = { params: Promise<{ chave: string }> };

/**
 * GET /api/configuracoes/:chave
 *
 * Retorna os dados de uma configuração específica pela sua chave.
 *
 * Exemplos:
 *   GET /api/configuracoes/estoque_minimo
 *   GET /api/configuracoes/nome_instituicao
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Configuração encontrada.",
 *   "data": {
 *     "id": 1,
 *     "chave": "estoque_minimo",
 *     "valor": "2",
 *     "descricao": "Quantidade mínima de estoque...",
 *     "createdAt": "...",
 *     "updatedAt": "..."
 *   }
 * }
 */
export async function GET(request: NextRequest, context: RouteContext) {
  // 1. Verifica autenticação
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Extrai a chave da URL
  const { chave } = await context.params;

  if (!chave || chave.trim().length === 0) {
    return Response.json(
      { success: false, error: 'A chave da configuração é obrigatória.' },
      { status: 400 }
    );
  }

  try {
    // 3. Busca a configuração pela chave
    const ds = await getDataSource();
    const repo = ds.getRepository(Configuracao);

    const config = await repo.findOneBy({ chave: chave.trim() });

    if (!config) {
      return Response.json(
        { success: false, error: `Configuração "${chave}" não encontrada.` },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: 'Configuração encontrada.',
      data: config,
    });
  } catch (error) {
    console.error('[GET /api/configuracoes/:chave] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar configuração.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/configuracoes/:chave
 *
 * Atualiza o valor de uma configuração existente.
 *
 * Body esperado (JSON):
 * {
 *   "valor": "5"
 * }
 *
 * Exemplos de uso:
 *   PUT /api/configuracoes/estoque_minimo      → { "valor": "5" }
 *   PUT /api/configuracoes/nome_instituicao    → { "valor": "Casa de Repouso XYZ" }
 *   PUT /api/configuracoes/notificacoes_ativas → { "valor": "false" }
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Configuração \"estoque_minimo\" atualizada com sucesso.",
 *   "data": {
 *     "id": 1,
 *     "chave": "estoque_minimo",
 *     "valor": "5",
 *     "descricao": "...",
 *     "updatedAt": "..."
 *   }
 * }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  // 1. Verifica autenticação
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Extrai a chave da URL
  const { chave } = await context.params;

  if (!chave || chave.trim().length === 0) {
    return Response.json(
      { success: false, error: 'A chave da configuração é obrigatória.' },
      { status: 400 }
    );
  }

  // 3. Extrai o corpo da requisição
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'O corpo da requisição deve ser um JSON válido.' },
      { status: 400 }
    );
  }

  // 4. Valida que o campo `valor` está presente e é uma string
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).valor !== 'string'
  ) {
    return Response.json(
      {
        success: false,
        error: 'O campo "valor" é obrigatório e deve ser uma string.',
      },
      { status: 422 }
    );
  }

  const { valor } = body as { valor: string };

  // 5. Validação básica: valor não pode ser vazio
  if (valor.trim().length === 0) {
    return Response.json(
      { success: false, error: 'O valor da configuração não pode ser vazio.' },
      { status: 422 }
    );
  }

  try {
    // 6. Busca a configuração existente
    const ds = await getDataSource();
    const repo = ds.getRepository(Configuracao);

    const existing = await repo.findOneBy({ chave: chave.trim() });

    if (!existing) {
      return Response.json(
        { success: false, error: `Configuração "${chave}" não encontrada.` },
        { status: 404 }
      );
    }

    // 7. Atualiza o valor
    const valorAnterior = existing.valor;
    existing.valor = valor.trim();
    const updated = await repo.save(existing);

    return Response.json({
      success: true,
      message: `Configuração "${chave}" atualizada com sucesso.`,
      data: updated,
      valor_anterior: valorAnterior,
    });
  } catch (error) {
    console.error('[PUT /api/configuracoes/:chave] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao atualizar configuração.' },
      { status: 500 }
    );
  }
}
