/**
 * ==============================================================================
 * API ROUTE: PACIENTES — LISTAGEM E CADASTRO (src/app/api/pacientes/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET  /api/pacientes        → Lista pacientes ativos (padrão)
 *   GET  /api/pacientes?ativo=false → Lista pacientes desativados e seu histórico
 *   GET  /api/pacientes?ativo=todos → Lista todos os pacientes
 *   POST /api/pacientes        → Cadastra um novo paciente (com validação de CPF)
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   1. Validação de CPF obrigatória no cadastro (algoritmo oficial)
 *   2. GET agora suporta filtro por status (ativo/desativado/todos)
 *   3. Listagem de pacientes desativados com histórico
 *
 * AUTENTICAÇÃO:
 *   Ambos os endpoints exigem autenticação via JWT (cookie httpOnly ou header Bearer).
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidades Paciente, Produto, LogEstoque, Notificacao).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { createPacienteSchema } from '@/lib/validations/paciente';
import { getDataSource } from '@/lib/database/data-source';
import { Paciente } from '@/lib/database/entities/Paciente';
import { Notificacao } from '@/lib/database/entities/Notificacao';
import { userRepository } from '@/lib/db';
import { formatCPF } from '@/lib/validations/cpf';

/**
 * GET /api/pacientes
 *
 * Retorna a lista de pacientes, com filtro opcional por status.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "O sistema deve ter uma opção de listar pacientes desativados e seu histórico"
 *   → Usar query param ?ativo=false para listar desativados
 *
 * Query Params:
 *   ?ativo=true   → Apenas pacientes ativos (padrão se omitido)
 *   ?ativo=false  → Apenas pacientes desativados
 *   ?ativo=todos  → Todos os pacientes (ativos e desativados)
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
    // 2. Busca pacientes via TypeORM com filtro de status
    const ds = await getDataSource();
    const repo = ds.getRepository(Paciente);

    // 3. Determina o filtro de status baseado no query param
    const url = new URL(request.url);
    const ativoParam = url.searchParams.get('ativo');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (ativoParam === 'false') {
      // Lista apenas pacientes desativados
      where.ativo = false;
    } else if (ativoParam === 'todos') {
      // Lista todos (sem filtro de status)
      // where permanece vazio
    } else {
      // Padrão: lista apenas pacientes ativos
      where.ativo = true;
    }

    const pacientes = await repo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    // 4. Monta a mensagem descritiva baseada no filtro
    const statusLabel =
      ativoParam === 'false'
        ? 'desativado(s)'
        : ativoParam === 'todos'
          ? '(total)'
          : 'ativo(s)';

    return Response.json({
      success: true,
      message: `${pacientes.length} paciente(s) ${statusLabel} encontrado(s).`,
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
 *
 * Cadastra um novo paciente no banco de dados.
 *
 * REGRAS DE NEGÓCIO (Sprint 04):
 *   1. CPF é obrigatório e validado pelo algoritmo oficial da Receita Federal
 *   2. CPF não pode ser duplicado (constraint UNIQUE no banco)
 *   3. Ao cadastrar, cria automaticamente 3 itens padrão no estoque do paciente
 *   4. Gera LOGs de criação para cada item padrão
 *   5. Gera notificação para a equipe de enfermagem
 *
 * Body esperado (JSON):
 * {
 *   "cpf": "123.456.789-09",           // obrigatório — aceita com ou sem formatação
 *   "nome_completo": "João da Silva",   // obrigatório
 *   "data_nascimento": "1950-03-15",    // obrigatório
 *   "observacoes_medicas": "Hipertenso" // opcional
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
    // 3. Obtém conexão e repositórios
    const ds = await getDataSource();
    const pacienteRepo = ds.getRepository(Paciente);
    const notificacaoRepo = ds.getRepository(Notificacao);

    // 4. Verifica se já existe um paciente com este CPF
    const cpfExistente = await pacienteRepo.findOneBy({ cpf: result.data.cpf });
    if (cpfExistente) {
      return Response.json(
        {
          success: false,
          error: `Já existe um paciente cadastrado com o CPF ${formatCPF(result.data.cpf)}.`,
        },
        { status: 409 }
      );
    }

    // 5. Cria e salva o paciente (começa sem itens no estoque)
    const newPaciente = pacienteRepo.create({
      cpf: result.data.cpf,
      nomeCompleto: result.data.nome_completo,
      dataNascimento: result.data.data_nascimento,
      observacoesMedicas: result.data.observacoes_medicas ?? null,
      ativo: true,  // Paciente começa como ativo
    });

    const savedPaciente = await pacienteRepo.save(newPaciente);

    // 6. Busca o nome do usuário que está realizando o cadastro
    const usuarioInfo = await userRepository.findById(user.userId);
    const nomeUsuario = usuarioInfo?.name ?? 'Sistema';

    // 7. Cria notificação para a equipe de enfermagem
    const notificacao = notificacaoRepo.create({
      tipo: 'SISTEMA',
      titulo: `Novo paciente cadastrado: ${savedPaciente.nomeCompleto}`,
      mensagem: `O paciente "${savedPaciente.nomeCompleto}" (CPF: ${formatCPF(savedPaciente.cpf)}) foi cadastrado no sistema por ${nomeUsuario}.`,
      destinatarioId: null,  // Notificação para todos (broadcast)
      referenciaTipo: 'paciente',
      referenciaId: savedPaciente.id,
      lida: false,
    });
    await notificacaoRepo.save(notificacao);

    // 8. Retorna o paciente criado
    return Response.json(
      {
        success: true,
        message: 'Paciente cadastrado com sucesso!',
        data: savedPaciente,
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
