/**
 * ==============================================================================
 * API ROUTE: ALERTA DE ESTOQUE POR ID — MARCAR COMO LIDO
 * (src/app/api/estoque/alertas/[id]/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET   /api/estoque/alertas/:id  → Retorna um alerta específico
 *   PATCH /api/estoque/alertas/:id  → Marca o alerta como lido/não lido
 *
 * AUTENTICAÇÃO:
 *   Ambos os endpoints exigem autenticação via JWT.
 *
 * PARÂMETRO DINÂMICO:
 *   [id] — Número inteiro (ID auto-increment) do alerta.
 *   No Next.js 16+, o `params` é uma Promise que deve ser await.
 *
 * DESCRIÇÃO:
 *   O endpoint PATCH permite ao funcionário marcar um alerta como "lido"
 *   (resolvido) ou reverter para "não lido". Isso ajuda no controle
 *   dos alertas pendentes de estoque.
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidade AlertaEstoque).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { getDataSource } from '@/lib/database/data-source';
import { AlertaEstoque } from '@/lib/database/entities/AlertaEstoque';

// Tipo do contexto de rota com parâmetro dinâmico [id]
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Valida e converte o parâmetro `id` de string para número inteiro.
 * Retorna o número ou null se inválido.
 */
function parseIntId(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || String(parsed) !== id) {
    return null;
  }
  return parsed;
}

/**
 * GET /api/estoque/alertas/:id
 *
 * Retorna os dados completos de um alerta específico.
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Alerta encontrado.",
 *   "data": { id, produtoId, produtoNome, quantidade, mensagem, lido, createdAt }
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

  // 2. Extrai e valida o ID da URL
  const { id } = await context.params;
  const numericId = parseIntId(id);

  if (numericId === null) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado um número inteiro positivo.' },
      { status: 400 }
    );
  }

  try {
    // 3. Busca o alerta pelo ID
    const ds = await getDataSource();
    const repo = ds.getRepository(AlertaEstoque);

    const alerta = await repo.findOneBy({ id: numericId });

    if (!alerta) {
      return Response.json(
        { success: false, error: 'Alerta não encontrado.' },
        { status: 404 }
      );
    }

    // 4. Retorna o alerta
    return Response.json({
      success: true,
      message: 'Alerta encontrado.',
      data: alerta,
    });
  } catch (error) {
    console.error('[GET /api/estoque/alertas/:id] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar alerta.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/estoque/alertas/:id
 *
 * Marca um alerta como lido (resolvido) ou reverte para não lido.
 * Usado pelo funcionário para indicar que já tomou providências.
 *
 * Body esperado (JSON):
 * {
 *   "lido": true    // true para marcar como lido, false para reverter
 * }
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Alerta marcado como lido.",
 *   "data": { id, produtoId, produtoNome, quantidade, mensagem, lido, createdAt }
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

  // 2. Extrai e valida o ID da URL
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

  // 4. Valida que o campo `lido` é um booleano
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).lido !== 'boolean'
  ) {
    return Response.json(
      {
        success: false,
        error: 'O campo "lido" é obrigatório e deve ser true ou false.',
      },
      { status: 422 }
    );
  }

  const { lido } = body as { lido: boolean };

  try {
    // 5. Busca o alerta existente
    const ds = await getDataSource();
    const repo = ds.getRepository(AlertaEstoque);

    const existing = await repo.findOneBy({ id: numericId });

    if (!existing) {
      return Response.json(
        { success: false, error: 'Alerta não encontrado.' },
        { status: 404 }
      );
    }

    // 6. Atualiza o status de leitura do alerta
    existing.lido = lido;
    const updated = await repo.save(existing);

    // 7. Retorna o alerta atualizado com mensagem descritiva
    return Response.json({
      success: true,
      message: lido
        ? 'Alerta marcado como lido.'
        : 'Alerta marcado como não lido.',
      data: updated,
    });
  } catch (error) {
    console.error('[PATCH /api/estoque/alertas/:id] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao atualizar alerta.' },
      { status: 500 }
    );
  }
}
