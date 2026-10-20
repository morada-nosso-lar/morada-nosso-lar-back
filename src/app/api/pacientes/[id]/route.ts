/**
 * ==============================================================================
 * API ROUTE: PACIENTE POR ID — DETALHE, EDIÇÃO, DESATIVAÇÃO E REATIVAÇÃO
 * (src/app/api/pacientes/[id]/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET   /api/pacientes/:id  → Retorna os dados de um paciente específico
 *   PUT   /api/pacientes/:id  → Atualiza os dados de um paciente (exceto CPF)
 *   PATCH /api/pacientes/:id  → Desativa ou reativa um paciente
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   1. DELETE foi REMOVIDO — pacientes não podem mais ser excluídos
 *      "O sistema não deve permitir que um paciente seja excluído,
 *       pois ao excluir um paciente todo o histórico deste paciente também é apagado"
 *   2. PATCH adicionado para desativar/reativar pacientes
 *      "O sistema deve desativar pacientes, zerando seus estoques
 *       e não permitindo mais que haja qualquer tipo de movimentação com ele"
 *   3. GET agora retorna também os produtos vinculados ao paciente
 *
 * AUTENTICAÇÃO:
 *   Todos os endpoints exigem autenticação via JWT.
 *
 * PARÂMETRO DINÂMICO:
 *   [id] — Número inteiro (ID auto-increment) do paciente (passado via URL).
 *   No Next.js 16+, o `params` é uma Promise que deve ser await.
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { updatePacienteSchema, desativarPacienteSchema } from '@/lib/validations/paciente';
import { getDataSource } from '@/lib/database/data-source';
import { Paciente } from '@/lib/database/entities/Paciente';
import { Produto } from '@/lib/database/entities/Produto';
import { LogEstoque } from '@/lib/database/entities/LogEstoque';
import { Notificacao } from '@/lib/database/entities/Notificacao';
import { userRepository } from '@/lib/db';

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
 * GET /api/pacientes/:id
 *
 * Retorna os dados completos de um único paciente, incluindo seus produtos
 * vinculados no estoque (se houver).
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   Pacientes desativados também podem ser consultados (para ver histórico).
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
    // 3. Busca o paciente via TypeORM
    const ds = await getDataSource();
    const pacienteRepo = ds.getRepository(Paciente);
    const produtoRepo = ds.getRepository(Produto);

    const paciente = await pacienteRepo.findOneBy({ id: numericId });

    if (!paciente) {
      return Response.json(
        { success: false, error: 'Paciente não encontrado.' },
        { status: 404 }
      );
    }

    // 4. Busca os produtos vinculados ao paciente
    const produtos = await produtoRepo.find({
      where: { pacienteId: numericId },
      order: { createdAt: 'DESC' },
    });

    return Response.json({
      success: true,
      message: 'Paciente encontrado.',
      data: {
        ...paciente,
        produtos,  // Produtos vinculados ao estoque do paciente
      },
    });
  } catch (error) {
    console.error('[GET /api/pacientes/:id] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar paciente.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pacientes/:id
 *
 * Atualiza os dados de um paciente existente.
 *
 * REGRAS DE NEGÓCIO (Sprint 04):
 *   1. O CPF NÃO pode ser alterado (é um documento imutável)
 *   2. Pacientes desativados NÃO podem ser editados
 *
 * Body esperado (JSON) — campos opcionais (exceto CPF):
 * {
 *   "nome_completo": "Maria Silva Santos",
 *   "data_nascimento": "1948-07-20",
 *   "observacoes_medicas": "Diabética tipo 2, insulina NPH"
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

  // 2. Extrai e valida o ID da URL
  const { id } = await context.params;
  const numericId = parseIntId(id);

  if (numericId === null) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado um número inteiro positivo.' },
      { status: 400 }
    );
  }

  // 3. Extrai e valida o corpo da requisição
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'O corpo da requisição deve ser um JSON válido.' },
      { status: 400 }
    );
  }

  const result = updatePacienteSchema.safeParse(body);
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
    // 4. Verifica se o paciente existe
    const ds = await getDataSource();
    const repo = ds.getRepository(Paciente);

    const existing = await repo.findOneBy({ id: numericId });

    if (!existing) {
      return Response.json(
        { success: false, error: 'Paciente não encontrado.' },
        { status: 404 }
      );
    }

    // 5. Verifica se o paciente está ativo (desativados não podem ser editados)
    if (!existing.ativo) {
      return Response.json(
        {
          success: false,
          error: 'Paciente desativado. Não é possível editar dados de pacientes desativados.',
        },
        { status: 403 }
      );
    }

    // 6. Aplica as atualizações (mapeando snake_case do Zod → camelCase da entidade)
    //    NOTA: CPF não está presente no updatePacienteSchema (é imutável)
    const updateData = result.data;
    if (updateData.nome_completo !== undefined) {
      existing.nomeCompleto = updateData.nome_completo;
    }
    if (updateData.data_nascimento !== undefined) {
      existing.dataNascimento = updateData.data_nascimento;
    }
    if (updateData.observacoes_medicas !== undefined) {
      existing.observacoesMedicas = updateData.observacoes_medicas ?? null;
    }

    const updated = await repo.save(existing);

    return Response.json({
      success: true,
      message: 'Paciente atualizado com sucesso!',
      data: updated,
    });
  } catch (error) {
    console.error('[PUT /api/pacientes/:id] Erro ao atualizar paciente:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao atualizar paciente.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pacientes/:id
 *
 * Desativa ou reativa um paciente no sistema.
 *
 * REGRAS DE NEGÓCIO (Sprint 04):
 *   1. "O sistema não deve permitir que um paciente seja excluído"
 *      → Usa-se desativação (soft delete) em vez de exclusão (hard delete)
 *   2. "O sistema deve desativar pacientes, zerando seus estoques
 *       e não permitindo mais que haja qualquer tipo de movimentação com ele"
 *      → Ao desativar, todos os produtos vinculados ao paciente têm quantidade zerada
 *   3. LOGs são gerados para cada item zerado
 *   4. Notificação enviada para a equipe de enfermagem
 *
 * DESATIVAÇÃO — Body esperado (JSON):
 * {
 *   "acao": "desativar",
 *   "motivo": "Paciente transferido para outra instituição"
 * }
 *
 * REATIVAÇÃO — Body esperado (JSON):
 * {
 *   "acao": "reativar"
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

  // 4. Valida o campo `acao` (desativar ou reativar)
  if (
    typeof body !== 'object' ||
    body === null ||
    !['desativar', 'reativar'].includes((body as Record<string, unknown>).acao as string)
  ) {
    return Response.json(
      {
        success: false,
        error: 'O campo "acao" é obrigatório e deve ser "desativar" ou "reativar".',
      },
      { status: 422 }
    );
  }

  const { acao } = body as { acao: 'desativar' | 'reativar' };

  try {
    const ds = await getDataSource();
    const pacienteRepo = ds.getRepository(Paciente);
    const produtoRepo = ds.getRepository(Produto);
    const logRepo = ds.getRepository(LogEstoque);
    const notificacaoRepo = ds.getRepository(Notificacao);

    // 5. Busca o paciente
    const existing = await pacienteRepo.findOneBy({ id: numericId });
    if (!existing) {
      return Response.json(
        { success: false, error: 'Paciente não encontrado.' },
        { status: 404 }
      );
    }

    // 6. Busca nome do usuário que está realizando a ação
    const usuarioInfo = await userRepository.findById(user.userId);
    const nomeUsuario = usuarioInfo?.name ?? 'Sistema';

    // ===================================================================
    // AÇÃO: DESATIVAR PACIENTE
    // ===================================================================
    if (acao === 'desativar') {
      // 6a. Verifica se já está desativado
      if (!existing.ativo) {
        return Response.json(
          { success: false, error: 'Este paciente já está desativado.' },
          { status: 409 }
        );
      }

      // 6b. Valida o motivo da desativação
      const motivoResult = desativarPacienteSchema.safeParse(body);
      if (!motivoResult.success) {
        return Response.json(
          {
            success: false,
            error: 'Dados inválidos para desativação.',
            details: motivoResult.error.flatten().fieldErrors,
          },
          { status: 422 }
        );
      }

      // 6c. Zera todos os produtos vinculados ao paciente
      const produtos = await produtoRepo.find({
        where: { pacienteId: numericId },
      });

      let itensZerados = 0;
      for (const produto of produtos) {
        if (produto.quantidade > 0) {
          // Registra LOG antes de zerar
          const log = logRepo.create({
            produtoId: produto.id,
            pacienteId: numericId,
            usuarioId: user.userId,
            usuarioNome: nomeUsuario,
            acao: 'ESTOQUE_ZERADO',
            campoAlterado: 'quantidade',
            valorAnterior: String(produto.quantidade),
            valorNovo: '0',
            descricao: `Estoque do produto "${produto.nome}" zerado de ${produto.quantidade} para 0 unidade(s) devido à desativação do paciente "${existing.nomeCompleto}".`,
          });
          await logRepo.save(log);

          // Zera a quantidade
          produto.quantidade = 0;
          await produtoRepo.save(produto);
          itensZerados++;
        }
      }

      // 6d. Desativa o paciente
      existing.ativo = false;
      existing.dataDesativacao = new Date();
      existing.motivoDesativacao = motivoResult.data.motivo;
      const updated = await pacienteRepo.save(existing);

      // 6e. Gera notificação para a equipe de enfermagem
      const notificacao = notificacaoRepo.create({
        tipo: 'PACIENTE_DESATIVADO',
        titulo: `Paciente desativado: ${existing.nomeCompleto}`,
        mensagem: `O paciente "${existing.nomeCompleto}" foi desativado por ${nomeUsuario}. Motivo: ${motivoResult.data.motivo}. ${itensZerados} item(ns) de estoque foram zerados.`,
        destinatarioId: null,  // Broadcast para toda equipe
        referenciaTipo: 'paciente',
        referenciaId: numericId,
        lida: false,
      });
      await notificacaoRepo.save(notificacao);

      return Response.json({
        success: true,
        message: `Paciente "${existing.nomeCompleto}" desativado com sucesso. ${itensZerados} item(ns) de estoque zerado(s).`,
        data: updated,
      });
    }

    // ===================================================================
    // AÇÃO: REATIVAR PACIENTE
    // ===================================================================
    if (acao === 'reativar') {
      // 7a. Verifica se já está ativo
      if (existing.ativo) {
        return Response.json(
          { success: false, error: 'Este paciente já está ativo.' },
          { status: 409 }
        );
      }

      // 7b. Reativa o paciente
      existing.ativo = true;
      existing.dataDesativacao = null;
      existing.motivoDesativacao = null;
      const updated = await pacienteRepo.save(existing);

      // 7c. Gera notificação para a equipe de enfermagem
      const notificacao = notificacaoRepo.create({
        tipo: 'PACIENTE_ATIVADO',
        titulo: `Paciente reativado: ${existing.nomeCompleto}`,
        mensagem: `O paciente "${existing.nomeCompleto}" foi reativado no sistema por ${nomeUsuario}.`,
        destinatarioId: null,
        referenciaTipo: 'paciente',
        referenciaId: numericId,
        lida: false,
      });
      await notificacaoRepo.save(notificacao);

      return Response.json({
        success: true,
        message: `Paciente "${existing.nomeCompleto}" reativado com sucesso!`,
        data: updated,
      });
    }

    // Fallback (não deveria chegar aqui)
    return Response.json(
      { success: false, error: 'Ação não reconhecida.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[PATCH /api/pacientes/:id] Erro:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao processar ação no paciente.' },
      { status: 500 }
    );
  }
}
