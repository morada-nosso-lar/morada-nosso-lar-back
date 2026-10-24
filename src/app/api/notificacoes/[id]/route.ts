/**
 * ==============================================================================
 * API ROUTE: NOTIFICAÇÃO POR ID — DETALHES E MARCAR COMO LIDA
 * (src/app/api/notificacoes/[id]/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET    /api/notificacoes/:id → Retorna uma notificação específica
 *   PATCH  /api/notificacoes/:id → Marca a notificação como lida/não lida
 *   DELETE /api/notificacoes/:id → Exclui uma notificação
 *
 * AUTENTICAÇÃO:
 *   Todos os endpoints exigem autenticação via JWT.
 *
 * PARÂMETRO DINÂMICO:
 *   [id] — Número inteiro (ID auto-increment) da notificação.
 *   No Next.js 16+, o `params` é uma Promise que deve ser await.
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { getDataSource } from '@/lib/database/data-source';
import { Notificacao } from '@/lib/database/entities/Notificacao';

// Tipo do contexto de rota com parâmetro dinâmico [id]
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Valida e converte o parâmetro `id` de string para número inteiro.
 */
function parseIntId(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || String(parsed) !== id) {
    return null;
  }
  return parsed;
}

/**
 * GET /api/notificacoes/:id
 *
 * Retorna os dados completos de uma notificação específica.
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

  // 2. Extrai e valida o ID
  const { id } = await context.params;
  const numericId = parseIntId(id);

  if (numericId === null) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado um número inteiro positivo.' },
      { status: 400 }
    );
  }

  try {
    // 3. Busca a notificação
    const ds = await getDataSource();
    const repo = ds.getRepository(Notificacao);

    const notificacao = await repo.findOneBy({ id: numericId });

    if (!notificacao) {
      return Response.json(
        { success: false, error: 'Notificação não encontrada.' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: 'Notificação encontrada.',
      data: notificacao,
    });
  } catch (error) {
    console.error('[GET /api/notificacoes/:id] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar notificação.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notificacoes/:id
 *
 * Marca uma notificação como lida ou não lida.
 * Permite que a equipe de enfermagem controle quais notificações já foram vistas.
 *
 * Body esperado (JSON):
 * {
 *   "lida": true    // true para marcar como lida, false para reverter
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  // 1. Verifica autenticação
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Extrai e valida o ID
  const { id } = await context.params;
  const numericId = parseIntId(id);

  if (numericId === null) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado um número inteiro positivo.' },
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

  // 4. Valida que o campo `lida` é um booleano
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).lida !== 'boolean'
  ) {
    return Response.json(
      {
        success: false,
        error: 'O campo "lida" é obrigatório e deve ser true ou false.',
      },
      { status: 422 }
    );
  }

  const { lida } = body as { lida: boolean };

  try {
    // 5. Busca a notificação existente
    const ds = await getDataSource();
    const repo = ds.getRepository(Notificacao);

    const existing = await repo.findOneBy({ id: numericId });

    if (!existing) {
      return Response.json(
        { success: false, error: 'Notificação não encontrada.' },
        { status: 404 }
      );
    }

    // 6. Atualiza o status de leitura
    existing.lida = lida;
    const updated = await repo.save(existing);

    return Response.json({
      success: true,
      message: lida
        ? 'Notificação marcada como lida.'
        : 'Notificação marcada como não lida.',
      data: updated,
    });
  } catch (error) {
    console.error('[PATCH /api/notificacoes/:id] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao atualizar notificação.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notificacoes/:id
 *
 * Remove uma notificação de forma permanente.
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Notificação excluída com sucesso."
 * }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  // 1. Verifica autenticação
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Extrai e valida o ID
  const { id } = await context.params;
  const numericId = parseIntId(id);

  if (numericId === null) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado um número inteiro positivo.' },
      { status: 400 }
    );
  }

  try {
    // 3. Busca a notificação
    const ds = await getDataSource();
    const repo = ds.getRepository(Notificacao);

    const notificacao = await repo.findOneBy({ id: numericId });

    if (!notificacao) {
      return Response.json(
        { success: false, error: 'Notificação não encontrada.' },
        { status: 404 }
      );
    }

    // 4. Remove a notificação
    await repo.remove(notificacao);

    return Response.json({
      success: true,
      message: 'Notificação excluída com sucesso.',
    });
  } catch (error) {
    console.error('[DELETE /api/notificacoes/:id] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao excluir notificação.' },
      { status: 500 }
    );
  }
}
