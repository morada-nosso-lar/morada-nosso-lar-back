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
 *   [id] — UUID do paciente (passado via URL).
 *   No Next.js 16+, o `params` é uma Promise que deve ser await.
 */

import { NextRequest } from 'next/server';
import supabase from '@/lib/supabase';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { updatePacienteSchema } from '@/lib/validations/paciente';

// Tipo do contexto de rota com parâmetro dinâmico [id]
type RouteContext = { params: Promise<{ id: string }> };

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

  // 2. Extrai o ID da URL (params é Promise no Next.js 16+)
  const { id } = await context.params;

  // 3. Valida formato do UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado formato UUID.' },
      { status: 400 }
    );
  }

  // 4. Busca o paciente no Supabase
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return Response.json(
      { success: false, error: 'Paciente não encontrado.' },
      { status: 404 }
    );
  }

  return Response.json({
    success: true,
    message: 'Paciente encontrado.',
    data,
  });
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

  // 2. Extrai o ID da URL
  const { id } = await context.params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado formato UUID.' },
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

  // 4. Verifica se o paciente existe
  const { data: existing, error: findError } = await supabase
    .from('pacientes')
    .select('id')
    .eq('id', id)
    .single();

  if (findError || !existing) {
    return Response.json(
      { success: false, error: 'Paciente não encontrado.' },
      { status: 404 }
    );
  }

  // 5. Atualiza no Supabase (inclui updated_at)
  const { data, error } = await supabase
    .from('pacientes')
    .update({
      ...result.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[PUT /api/pacientes/:id] Erro ao atualizar paciente:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao atualizar paciente.' },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    message: 'Paciente atualizado com sucesso!',
    data,
  });
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

  // 2. Extrai o ID da URL
  const { id } = await context.params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return Response.json(
      { success: false, error: 'ID inválido. Esperado formato UUID.' },
      { status: 400 }
    );
  }

  // 3. Verifica se o paciente existe
  const { data: existing, error: findError } = await supabase
    .from('pacientes')
    .select('id, nome_completo')
    .eq('id', id)
    .single();

  if (findError || !existing) {
    return Response.json(
      { success: false, error: 'Paciente não encontrado.' },
      { status: 404 }
    );
  }

  // 4. Remove do Supabase
  const { error } = await supabase
    .from('pacientes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[DELETE /api/pacientes/:id] Erro ao excluir paciente:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao excluir paciente.' },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    message: `Paciente "${existing.nome_completo}" excluído com sucesso.`,
  });
}
