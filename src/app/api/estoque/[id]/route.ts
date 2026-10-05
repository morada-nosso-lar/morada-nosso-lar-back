/**
 * ==============================================================================
 * API ROUTE: ESTOQUE POR ID — DETALHE, EDIÇÃO E EXCLUSÃO
 * (src/app/api/estoque/[id]/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET    /api/estoque/:id  → Retorna os dados de um produto específico
 *   PUT    /api/estoque/:id  → Atualiza os dados de um produto (inclui quantidade)
 *   DELETE /api/estoque/:id  → Remove um produto do estoque
 *
 * AUTENTICAÇÃO:
 *   Todos os endpoints exigem autenticação via JWT.
 *
 * PARÂMETRO DINÂMICO:
 *   [id] — Número inteiro (ID auto-increment) do produto (passado via URL).
 *   No Next.js 16+, o `params` é uma Promise que deve ser await.
 *
 * ALERTA AUTOMÁTICO (PUT):
 *   Ao atualizar a quantidade de um produto para ≤ 2 unidades,
 *   um alerta é gerado automaticamente na tabela `alertas_estoque`.
 *   Isso permite rastrear quando produtos ficam com estoque crítico.
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidade Produto + AlertaEstoque).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { updateProdutoSchema } from '@/lib/validations/estoque';
import { getDataSource } from '@/lib/database/data-source';
import { Produto } from '@/lib/database/entities/Produto';
import { AlertaEstoque } from '@/lib/database/entities/AlertaEstoque';

/** Limite mínimo de estoque — abaixo ou igual a esse valor, gera alerta */
const ESTOQUE_MINIMO = 2;

// Tipo do contexto de rota com parâmetro dinâmico [id]
type RouteContext = { params: Promise<{ id: string }> };

/**
 * Valida e converte o parâmetro `id` de string para número inteiro.
 * Retorna o número ou null se inválido (não numérico, negativo, ou zero).
 */
function parseIntId(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || String(parsed) !== id) {
    return null;
  }
  return parsed;
}

/**
 * GET /api/estoque/:id
 *
 * Retorna os dados completos de um único produto.
 * Útil para exibir detalhes ou pré-preencher formulários de edição.
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Produto encontrado.",
 *   "data": { id, nome, categoria, quantidade, descricao, createdAt, updatedAt }
 * }
 *
 * Erros possíveis:
 *   400 → ID inválido (não é número inteiro positivo)
 *   401 → Usuário não autenticado
 *   404 → Produto não encontrado no banco
 *   500 → Erro interno do servidor
 */
export async function GET(request: NextRequest, context: RouteContext) {
  // 1. Verifica se o usuário está autenticado via JWT
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Extrai e valida o ID da URL (params é Promise no Next.js 16+)
  const { id } = await context.params;
  const numericId = parseIntId(id);

  if (numericId === null) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado um número inteiro positivo.' },
      { status: 400 }
    );
  }

  try {
    // 3. Busca o produto pelo ID via TypeORM
    const ds = await getDataSource();
    const repo = ds.getRepository(Produto);

    const produto = await repo.findOneBy({ id: numericId });

    // 4. Retorna 404 se o produto não existir
    if (!produto) {
      return Response.json(
        { success: false, error: 'Produto não encontrado.' },
        { status: 404 }
      );
    }

    // 5. Retorna os dados do produto
    return Response.json({
      success: true,
      message: 'Produto encontrado.',
      data: produto,
    });
  } catch (error) {
    console.error('[GET /api/estoque/:id] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar produto.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/estoque/:id
 *
 * Atualiza os dados de um produto existente no estoque.
 * Aceita atualização parcial — apenas os campos enviados serão alterados.
 *
 * ⚠️ ALERTA AUTOMÁTICO:
 *   Se a quantidade for atualizada para ≤ 2, um novo alerta é registrado
 *   automaticamente na tabela `alertas_estoque`.
 *
 * Body esperado (JSON) — todos os campos são opcionais:
 * {
 *   "nome": "Papel Toalha",
 *   "categoria": "Limpeza",
 *   "quantidade": 1,
 *   "descricao": "Pacote com 2 rolos"
 * }
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Produto atualizado com sucesso!",
 *   "data": { id, nome, categoria, quantidade, descricao, createdAt, updatedAt },
 *   "alerta": { ... } | null   // alerta gerado se quantidade ≤ 2
 * }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  // 1. Verifica se o usuário está autenticado via JWT
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

  // 3. Extrai o corpo da requisição (JSON)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'O corpo da requisição deve ser um JSON válido.' },
      { status: 400 }
    );
  }

  // 4. Valida os dados de entrada com o schema Zod (parcial)
  const result = updateProdutoSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: 'Dados inválidos. Verifique os campos enviados.',
        details: result.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  try {
    // 5. Busca o produto existente no banco
    const ds = await getDataSource();
    const produtoRepo = ds.getRepository(Produto);
    const alertaRepo = ds.getRepository(AlertaEstoque);

    const existing = await produtoRepo.findOneBy({ id: numericId });

    if (!existing) {
      return Response.json(
        { success: false, error: 'Produto não encontrado.' },
        { status: 404 }
      );
    }

    // 6. Aplica as atualizações (apenas campos enviados)
    const updateData = result.data;
    if (updateData.nome !== undefined) {
      existing.nome = updateData.nome;
    }
    if (updateData.categoria !== undefined) {
      existing.categoria = updateData.categoria;
    }
    if (updateData.quantidade !== undefined) {
      existing.quantidade = updateData.quantidade;
    }
    if (updateData.descricao !== undefined) {
      existing.descricao = updateData.descricao ?? null;
    }

    // 7. Salva as alterações no banco
    const updated = await produtoRepo.save(existing);

    // 8. Verifica se a quantidade ficou no limite mínimo → gera alerta
    //    Só gera alerta se a quantidade foi atualizada nesta operação
    let alerta = null;
    if (
      updateData.quantidade !== undefined &&
      updated.quantidade <= ESTOQUE_MINIMO
    ) {
      const novoAlerta = alertaRepo.create({
        produtoId: updated.id,
        produtoNome: updated.nome,
        quantidade: updated.quantidade,
        mensagem: `⚠️ ALERTA: O produto "${updated.nome}" atingiu ${updated.quantidade} unidade(s). Estoque abaixo do mínimo (${ESTOQUE_MINIMO}).`,
        lido: false,
      });
      alerta = await alertaRepo.save(novoAlerta);
    }

    // 9. Retorna o produto atualizado (e o alerta, se gerado)
    return Response.json({
      success: true,
      message: alerta
        ? `Produto atualizado com sucesso! ⚠️ Alerta: estoque baixo (${updated.quantidade} unidade(s)).`
        : 'Produto atualizado com sucesso!',
      data: updated,
      alerta,
    });
  } catch (error) {
    console.error('[PUT /api/estoque/:id] Erro ao atualizar produto:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao atualizar produto.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/estoque/:id
 *
 * Remove um produto do estoque de forma permanente (hard delete).
 * Os alertas relacionados ao produto também são removidos (CASCADE).
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Produto \"Papel Higiênico\" excluído com sucesso."
 * }
 *
 * Erros possíveis:
 *   400 → ID inválido
 *   401 → Usuário não autenticado
 *   404 → Produto não encontrado
 *   500 → Erro interno
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  // 1. Verifica se o usuário está autenticado via JWT
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
    // 3. Busca o produto para verificar se existe
    const ds = await getDataSource();
    const repo = ds.getRepository(Produto);

    const existing = await repo.findOneBy({ id: numericId });

    if (!existing) {
      return Response.json(
        { success: false, error: 'Produto não encontrado.' },
        { status: 404 }
      );
    }

    // 4. Remove o produto (os alertas relacionados são excluídos via CASCADE)
    await repo.remove(existing);

    // 5. Retorna confirmação de exclusão
    return Response.json({
      success: true,
      message: `Produto "${existing.nome}" excluído com sucesso.`,
    });
  } catch (error) {
    console.error('[DELETE /api/estoque/:id] Erro ao excluir produto:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao excluir produto.' },
      { status: 500 }
    );
  }
}
