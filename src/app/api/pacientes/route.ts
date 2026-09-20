/**
 * ==============================================================================
 * API ROUTE: PACIENTES — LISTAGEM E CADASTRO (src/app/api/pacientes/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET  /api/pacientes  → Lista todos os pacientes (ordenados por created_at desc)
 *   POST /api/pacientes  → Cadastra um novo paciente
 *
 * AUTENTICAÇÃO:
 *   Ambos os endpoints exigem autenticação via JWT (cookie httpOnly ou header Bearer).
 *   Utiliza o helper getAuthenticatedUserFromRequest já existente no projeto.
 *
 * VALIDAÇÃO:
 *   O POST utiliza Zod (createPacienteSchema) para validar os dados de entrada.
 *
 * BANCO DE DADOS:
 *   Supabase (tabela `pacientes`).
 */

import { NextRequest } from 'next/server';
import supabase from '@/lib/supabase';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { createPacienteSchema } from '@/lib/validations/paciente';

/**
 * GET /api/pacientes
 * Retorna a lista completa de pacientes cadastrados.
 */
export async function GET(request: NextRequest) {
  // 1. Verifica autenticação
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Busca todos os pacientes no Supabase
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/pacientes] Erro ao buscar pacientes:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar pacientes.' },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    message: `${data.length} paciente(s) encontrado(s).`,
    data,
  });
}

/**
 * POST /api/pacientes
 * Cadastra um novo paciente no banco de dados.
 *
 * Body esperado (JSON):
 * {
 *   "nome_completo": "João da Silva",
 *   "data_nascimento": "1950-03-15",
 *   "observacoes_medicas": "Hipertenso, usa losartana 50mg"
 * }
 */
export async function POST(request: NextRequest) {
  // 1. Verifica autenticação
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Extrai e valida o corpo da requisição
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'O corpo da requisição deve ser um JSON válido.' },
      { status: 400 }
    );
  }

  const result = createPacienteSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      {
        success: false,
        error: 'Dados inválidos. Verifique os campos obrigatórios.',
        details: result.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  // 3. Insere no Supabase
  const { nome_completo, data_nascimento, observacoes_medicas } = result.data;

  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      nome_completo,
      data_nascimento,
      observacoes_medicas: observacoes_medicas ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/pacientes] Erro ao cadastrar paciente:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao cadastrar paciente.' },
      { status: 500 }
    );
  }

  return Response.json(
    {
      success: true,
      message: 'Paciente cadastrado com sucesso!',
      data,
    },
    { status: 201 }
  );
}
