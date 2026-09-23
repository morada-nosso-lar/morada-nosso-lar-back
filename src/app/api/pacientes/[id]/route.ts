/**
 * ==============================================================================
 * API ROUTE: PACIENTE POR ID — DETALHE, EDIÇÃO E EXCLUSÃO
 * (src/app/api/pacientes/[id]/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET    /api/pacientes/:id  → Retorna os dados de um paciente específico
 *   PUT    /api/pacientes/:id  → Atualiza os dados de um paciente
 *   DELETE /api/pacientes/:id  → Remove um paciente do banco de dados
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
import { updatePacienteSchema } from '@/lib/validations/paciente';
import { getDataSource } from '@/lib/database/data-source';
import { Paciente } from '@/lib/database/entities/Paciente';

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
 * Retorna os dados completos de um único paciente.
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
    const repo = ds.getRepository(Paciente);

    const paciente = await repo.findOneBy({ id: numericId });

    if (!paciente) {
      return Response.json(
        { success: false, error: 'Paciente não encontrado.' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: 'Paciente encontrado.',
      data: paciente,
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
 * Atualiza os dados de um paciente existente.
 *
 * Body esperado (JSON) — campos opcionais:
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

    // 5. Aplica as atualizações (mapeando snake_case do Zod → camelCase da entidade)
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
 * DELETE /api/pacientes/:id
 * Remove um paciente do banco de dados.
 * A exclusão é permanente (hard delete).
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
    // 3. Verifica se o paciente existe
    const ds = await getDataSource();
    const repo = ds.getRepository(Paciente);

    const existing = await repo.findOneBy({ id: numericId });

    if (!existing) {
      return Response.json(
        { success: false, error: 'Paciente não encontrado.' },
        { status: 404 }
      );
    }

    // 4. Remove do banco
    await repo.remove(existing);

    return Response.json({
      success: true,
      message: `Paciente "${existing.nomeCompleto}" excluído com sucesso.`,
    });
  } catch (error) {
    console.error('[DELETE /api/pacientes/:id] Erro ao excluir paciente:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao excluir paciente.' },
      { status: 500 }
    );
  }
}
