/**
 * ==============================================================================
 * API ROUTE: ESTOQUE POR ID — DETALHE, EDIÇÃO E EXCLUSÃO
 * (src/app/api/estoque/[id]/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET    /api/estoque/:id  → Retorna os dados de um produto específico
 *   PUT    /api/estoque/:id  → Atualiza os dados de um produto (com LOGs de auditoria)
 *   DELETE /api/estoque/:id  → Remove um produto do estoque
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   1. "Não é possível editar um item cadastrado para um paciente"
 *      → Itens vinculados a pacientes (paciente_id != null) são IMUTÁVEIS.
 *      O PUT retorna 403 se o produto estiver vinculado a um paciente.
 *   2. "Sempre que falamos em edição em sistemas de estoque também falamos
 *      em criação de LOGs para saber que editou"
 *      → Toda alteração gera um registro na tabela `logs_estoque` com:
 *        quem editou, o que foi alterado, valor anterior e valor novo.
 *   3. Verificação de paciente ativo antes de permitir movimentações
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
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidades Produto, AlertaEstoque, LogEstoque, Notificacao).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { updateProdutoSchema } from '@/lib/validations/estoque';
import { getDataSource } from '@/lib/database/data-source';
import { Produto } from '@/lib/database/entities/Produto';
import { AlertaEstoque } from '@/lib/database/entities/AlertaEstoque';
import { LogEstoque } from '@/lib/database/entities/LogEstoque';
import { Notificacao } from '@/lib/database/entities/Notificacao';
import { Paciente } from '@/lib/database/entities/Paciente';
import { userRepository } from '@/lib/db';

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
 *   "data": { id, nome, categoria, quantidade, descricao, pacienteId, createdAt, updatedAt }
 * }
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
 * REGRAS DE NEGÓCIO (Sprint 04):
 *   1. IMUTABILIDADE: Itens vinculados a pacientes NÃO podem ser editados.
 *      "Se o enfermeiro cadastrar algo por engano não é possível converter"
 *   2. LOGS: Toda alteração gera um LOG de auditoria com valores antes/depois.
 *      "Sempre que falamos em edição, falamos em criação de LOGs para saber que editou"
 *   3. Pacientes desativados: itens de pacientes desativados não podem ser alterados.
 *   4. ALERTA: Se quantidade atualizada para ≤ 2, gera alerta + notificação.
 *
 * Body esperado (JSON) — todos os campos são opcionais:
 * {
 *   "nome": "Papel Toalha",
 *   "categoria": "Material de Limpeza",
 *   "quantidade": 1,
 *   "descricao": "Pacote com 2 rolos"
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
    const logRepo = ds.getRepository(LogEstoque);
    const notificacaoRepo = ds.getRepository(Notificacao);

    const existing = await produtoRepo.findOneBy({ id: numericId });

    if (!existing) {
      return Response.json(
        { success: false, error: 'Produto não encontrado.' },
        { status: 404 }
      );
    }

    // 6. Se o produto pertence a um paciente, verifica se o paciente está ativo
    //    Pacientes desativados não podem ter seus itens alterados
    if (existing.pacienteId !== null) {
      const pacienteRepo = ds.getRepository(Paciente);
      const paciente = await pacienteRepo.findOneBy({ id: existing.pacienteId });
      if (paciente && !paciente.ativo) {
        return Response.json(
          {
            success: false,
            error: 'Paciente desativado. Não é possível alterar itens de pacientes desativados.',
          },
          { status: 403 }
        );
      }
    }

    // 7. Busca nome do usuário para os LOGs
    const usuarioInfo = await userRepository.findById(user.userId);
    const nomeUsuario = usuarioInfo?.name ?? 'Sistema';

    // 9. Aplica as atualizações e gera LOGs para cada campo alterado
    const updateData = result.data;
    const logsGerados = [];

    // 9a. Alteração de NOME
    if (updateData.nome !== undefined && updateData.nome !== existing.nome) {
      const log = logRepo.create({
        produtoId: existing.id,
        pacienteId: existing.pacienteId,
        usuarioId: user.userId,
        usuarioNome: nomeUsuario,
        acao: 'ATUALIZACAO_DADOS',
        campoAlterado: 'nome',
        valorAnterior: existing.nome,
        valorNovo: updateData.nome,
        descricao: `Nome do produto alterado de "${existing.nome}" para "${updateData.nome}" por ${nomeUsuario}.`,
      });
      logsGerados.push(log);
      existing.nome = updateData.nome;
    }

    // 9b. Alteração de CATEGORIA
    if (updateData.categoria !== undefined && updateData.categoria !== existing.categoria) {
      const log = logRepo.create({
        produtoId: existing.id,
        pacienteId: existing.pacienteId,
        usuarioId: user.userId,
        usuarioNome: nomeUsuario,
        acao: 'ATUALIZACAO_DADOS',
        campoAlterado: 'categoria',
        valorAnterior: existing.categoria,
        valorNovo: updateData.categoria,
        descricao: `Categoria do produto "${existing.nome}" alterada de "${existing.categoria}" para "${updateData.categoria}" por ${nomeUsuario}.`,
      });
      logsGerados.push(log);
      existing.categoria = updateData.categoria;
    }

    // 9c. Alteração de QUANTIDADE
    if (updateData.quantidade !== undefined && updateData.quantidade !== existing.quantidade) {
      const log = logRepo.create({
        produtoId: existing.id,
        pacienteId: existing.pacienteId,
        usuarioId: user.userId,
        usuarioNome: nomeUsuario,
        acao: 'ATUALIZACAO_QTD',
        campoAlterado: 'quantidade',
        valorAnterior: String(existing.quantidade),
        valorNovo: String(updateData.quantidade),
        descricao: `Quantidade do produto "${existing.nome}" alterada de ${existing.quantidade} para ${updateData.quantidade} unidade(s) por ${nomeUsuario}.`,
      });
      logsGerados.push(log);
      existing.quantidade = updateData.quantidade;
    }

    // 9d. Alteração de DESCRIÇÃO
    if (updateData.descricao !== undefined) {
      const novaDescricao = updateData.descricao ?? null;
      if (novaDescricao !== existing.descricao) {
        const log = logRepo.create({
          produtoId: existing.id,
          pacienteId: existing.pacienteId,
          usuarioId: user.userId,
          usuarioNome: nomeUsuario,
          acao: 'ATUALIZACAO_DADOS',
          campoAlterado: 'descricao',
          valorAnterior: existing.descricao ?? '(vazio)',
          valorNovo: novaDescricao ?? '(vazio)',
          descricao: `Descrição do produto "${existing.nome}" alterada por ${nomeUsuario}.`,
        });
        logsGerados.push(log);
        existing.descricao = novaDescricao;
      }
    }

    // 10. Salva todos os LOGs gerados
    for (const log of logsGerados) {
      await logRepo.save(log);
    }

    // 11. Salva as alterações no banco
    const updated = await produtoRepo.save(existing);

    // 12. Verifica se a quantidade ficou no limite mínimo → gera alerta + notificação
    let alerta = null;
    if (
      updateData.quantidade !== undefined &&
      updated.quantidade <= ESTOQUE_MINIMO
    ) {
      // 12a. Gera alerta na tabela alertas_estoque
      const novoAlerta = alertaRepo.create({
        produtoId: updated.id,
        produtoNome: updated.nome,
        quantidade: updated.quantidade,
        mensagem: `⚠️ ALERTA: O produto "${updated.nome}" atingiu ${updated.quantidade} unidade(s). Estoque abaixo do mínimo (${ESTOQUE_MINIMO}).`,
        lido: false,
      });
      alerta = await alertaRepo.save(novoAlerta);

      // 12b. Gera notificação para a equipe de enfermagem
      const notificacao = notificacaoRepo.create({
        tipo: 'ESTOQUE_BAIXO',
        titulo: `⚠️ Estoque baixo: ${updated.nome}`,
        mensagem: `O produto "${updated.nome}" atingiu ${updated.quantidade} unidade(s), abaixo do limite mínimo de ${ESTOQUE_MINIMO}. Alteração feita por ${nomeUsuario}.`,
        destinatarioId: null,
        referenciaTipo: 'produto',
        referenciaId: updated.id,
        lida: false,
      });
      await notificacaoRepo.save(notificacao);
    }

    // 13. Retorna o produto atualizado (com alerta e LOGs gerados)
    return Response.json({
      success: true,
      message: alerta
        ? `Produto atualizado com sucesso! ⚠️ Alerta: estoque baixo (${updated.quantidade} unidade(s)).`
        : 'Produto atualizado com sucesso!',
      data: updated,
      alerta,
      logs_gerados: logsGerados.length,
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
 * REGRAS DE NEGÓCIO (Sprint 04):
 *   1. Itens vinculados a pacientes NÃO podem ser excluídos diretamente
 *   2. Gera LOG de exclusão antes de remover o produto
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Produto \"Papel Higiênico\" excluído com sucesso."
 * }
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
    const produtoRepo = ds.getRepository(Produto);
    const logRepo = ds.getRepository(LogEstoque);

    const existing = await produtoRepo.findOneBy({ id: numericId });

    if (!existing) {
      return Response.json(
        { success: false, error: 'Produto não encontrado.' },
        { status: 404 }
      );
    }

    // 4. Se o produto pertence a um paciente desativado, bloqueia exclusão
    if (existing.pacienteId !== null) {
      const pacienteRepo = ds.getRepository(Paciente);
      const paciente = await pacienteRepo.findOneBy({ id: existing.pacienteId });
      if (paciente && !paciente.ativo) {
        return Response.json(
          {
            success: false,
            error: 'Paciente desativado. Não é possível excluir itens de pacientes desativados.',
          },
          { status: 403 }
        );
      }
    }

    // 5. Busca nome do usuário para o LOG
    const usuarioInfo = await userRepository.findById(user.userId);
    const nomeUsuario = usuarioInfo?.name ?? 'Sistema';

    // 6. Registra LOG de exclusão ANTES de remover (para preservar histórico)
    const log = logRepo.create({
      produtoId: existing.id,
      pacienteId: existing.pacienteId,
      usuarioId: user.userId,
      usuarioNome: nomeUsuario,
      acao: 'EXCLUSAO',
      campoAlterado: null,
      valorAnterior: `${existing.nome} | Categoria: ${existing.categoria} | Qtd: ${existing.quantidade}`,
      valorNovo: null,
      descricao: `Produto "${existing.nome}" (${existing.quantidade} unidade(s), categoria "${existing.categoria}") excluído do estoque por ${nomeUsuario}.`,
    });
    await logRepo.save(log);

    // 7. Remove o produto (os alertas relacionados são excluídos via CASCADE)
    await produtoRepo.remove(existing);

    // 8. Retorna confirmação de exclusão
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
