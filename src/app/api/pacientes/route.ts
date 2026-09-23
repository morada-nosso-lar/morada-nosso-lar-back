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
 *   Neon PostgreSQL via TypeORM (entidade Paciente).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { createPacienteSchema } from '@/lib/validations/paciente';
import { getDataSource } from '@/lib/database/data-source';
import { Paciente } from '@/lib/database/entities/Paciente';

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

  try {
    // 2. Busca todos os pacientes via TypeORM
    const ds = await getDataSource();
    const repo = ds.getRepository(Paciente);

    const pacientes = await repo.find({
      order: { createdAt: 'DESC' },
    });

    return Response.json({
      success: true,
      message: `${pacientes.length} paciente(s) encontrado(s).`,
      data: pacientes,
    });
  } catch (error) {
    console.error('[GET /api/pacientes] Erro ao buscar pacientes:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar pacientes.' },
      { status: 500 }
    );
  }
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

  try {
    // 3. Insere via TypeORM
    const ds = await getDataSource();
    const repo = ds.getRepository(Paciente);

    const newPaciente = repo.create({
      nomeCompleto: result.data.nome_completo,
      dataNascimento: result.data.data_nascimento,
      observacoesMedicas: result.data.observacoes_medicas ?? null,
    });

    const saved = await repo.save(newPaciente);

    return Response.json(
      {
        success: true,
        message: 'Paciente cadastrado com sucesso!',
        data: saved,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/pacientes] Erro ao cadastrar paciente:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao cadastrar paciente.' },
      { status: 500 }
    );
  }
}
