/**
 * ==============================================================================
 * API ROUTE: ESTOQUE — LISTAGEM E CADASTRO (src/app/api/estoque/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET  /api/estoque  → Lista todos os produtos do estoque (ordenados por created_at desc)
 *   POST /api/estoque  → Cadastra um novo produto no estoque
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   1. Categoria validada contra lista pré-definida
 *   2. Suporte a vínculo com paciente (paciente_id)
 *   3. LOGs de auditoria para cada produto cadastrado
 *   4. Filtros via query params: ?paciente_id=X, ?categoria=Y
 *   5. Verificação de paciente ativo antes de vincular produto
 *
 * AUTENTICAÇÃO:
 *   Ambos os endpoints exigem autenticação via JWT (cookie httpOnly ou header Bearer).
 *
 * ALERTA AUTOMÁTICO:
 *   Ao cadastrar um produto com quantidade ≤ 2, um alerta é gerado automaticamente
 *   na tabela `alertas_estoque` e retornado junto com a resposta.
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidades Produto, AlertaEstoque, LogEstoque, Notificacao).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { createProdutoSchema } from '@/lib/validations/estoque';
import { getDataSource } from '@/lib/database/data-source';
import { Produto } from '@/lib/database/entities/Produto';
import { AlertaEstoque } from '@/lib/database/entities/AlertaEstoque';
import { LogEstoque } from '@/lib/database/entities/LogEstoque';
import { Notificacao } from '@/lib/database/entities/Notificacao';
import { Paciente } from '@/lib/database/entities/Paciente';
import { Configuracao } from '@/lib/database/entities/Configuracao';
import { userRepository } from '@/lib/db';

/** Limite mínimo de estoque padrão caso nenhum valor seja informado */
const DEFAULT_ESTOQUE_MINIMO = 2;

/**
 * GET /api/estoque
 *
 * Retorna a lista completa de produtos cadastrados no estoque.
 * Os produtos são ordenados por data de criação (mais recentes primeiro).
 *
 * Query Params opcionais:
 *   ?paciente_id=5     → Filtra produtos vinculados ao paciente com ID 5
 *   ?categoria=Roupas  → Filtra produtos de uma categoria específica
 *   ?geral=true        → Lista apenas produtos do estoque geral (sem paciente vinculado)
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "10 produto(s) encontrado(s).",
 *   "data": [ { id, nome, categoria, quantidade, descricao, pacienteId, createdAt, updatedAt }, ... ]
 * }
 */
export async function GET(request: NextRequest) {
  // 1. Verifica se o usuário está autenticado via JWT
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  try {
    // 2. Obtém a conexão com o banco de dados via TypeORM
    const ds = await getDataSource();
    const repo = ds.getRepository(Produto);

    // 3. Monta os filtros baseados nos query params
    const url = new URL(request.url);
    const pacienteIdParam = url.searchParams.get('paciente_id');
    const categoriaParam = url.searchParams.get('categoria');
    const geralParam = url.searchParams.get('geral');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filtro por paciente vinculado
    if (pacienteIdParam) {
      const pacienteId = parseInt(pacienteIdParam, 10);
      if (!isNaN(pacienteId) && pacienteId > 0) {
        where.pacienteId = pacienteId;
      }
    }

    // Filtro para estoque geral (sem paciente)
    if (geralParam === 'true') {
      where.pacienteId = null;
    }

    // Filtro por categoria
    if (categoriaParam) {
      where.categoria = categoriaParam;
    }

    // 4. Busca todos os produtos ordenados por data de criação (DESC)
    const produtos = await repo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    // 5. Retorna a lista de produtos
    return Response.json({
      success: true,
      message: `${produtos.length} produto(s) encontrado(s).`,
      data: produtos,
    });
  } catch (error) {
    console.error('[GET /api/estoque] Erro ao buscar produtos:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar produtos.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/estoque
 *
 * Cadastra um novo produto no estoque.
 * Se a quantidade informada for ≤ 2, gera um alerta automático.
 *
 * REGRAS DE NEGÓCIO (Sprint 04):
 *   1. Categoria deve ser da lista pré-definida
 *   2. Se paciente_id informado, verifica se paciente existe e está ativo
 *   3. Gera LOG de auditoria para a criação
 *   4. Se estoque baixo, gera alerta E notificação para equipe
 *
 * Body esperado (JSON):
 * {
 *   "nome": "Papel Higiênico",
 *   "categoria": "Higiene Pessoal",       // deve ser da lista pré-definida
 *   "quantidade": 10,
 *   "descricao": "Pacote com 12 rolos",   // opcional
 *   "paciente_id": 5                       // opcional — vincula ao paciente
 * }
 */
export async function POST(request: NextRequest) {
  // 1. Verifica se o usuário está autenticado via JWT
  const user = getAuthenticatedUserFromRequest(request);
  if (!user) {
    return Response.json(
      { success: false, error: 'Acesso negado. Faça login para continuar.' },
      { status: 401 }
    );
  }

  // 2. Extrai o corpo da requisição (JSON)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'O corpo da requisição deve ser um JSON válido.' },
      { status: 400 }
    );
  }

  // 3. Valida os dados de entrada com o schema Zod
  const result = createProdutoSchema.safeParse(body);
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
    // 4. Obtém a conexão e os repositórios necessários
    const ds = await getDataSource();
    const produtoRepo = ds.getRepository(Produto);
    const alertaRepo = ds.getRepository(AlertaEstoque);
    const logRepo = ds.getRepository(LogEstoque);
    const notificacaoRepo = ds.getRepository(Notificacao);

    // 5. Se paciente_id foi informado, verifica se o paciente existe e está ativo
    const pacienteId = result.data.paciente_id ?? null;
    if (pacienteId !== null) {
      const pacienteRepo = ds.getRepository(Paciente);
      const paciente = await pacienteRepo.findOneBy({ id: pacienteId });

      if (!paciente) {
        return Response.json(
          { success: false, error: 'Paciente não encontrado.' },
          { status: 404 }
        );
      }

      // REGRA: Pacientes desativados não podem receber novos itens
      if (!paciente.ativo) {
        return Response.json(
          {
            success: false,
            error: 'Paciente desativado. Não é possível adicionar itens ao estoque de pacientes desativados.',
          },
          { status: 403 }
        );
      }
    }

    // 6. Busca o nome do usuário para o LOG
    const usuarioInfo = await userRepository.findById(user.userId);
    const nomeUsuario = usuarioInfo?.name ?? 'Sistema';

    // 7. Determina o estoque mínimo personalizado do produto
    let estoqueMinimo = result.data.estoque_minimo ?? result.data.estoqueMinimo;
    if (estoqueMinimo === undefined) {
      try {
        const configRepo = ds.getRepository(Configuracao);
        const config = await configRepo.findOneBy({ chave: 'estoque_minimo' });
        if (config && !isNaN(parseInt(config.valor, 10))) {
          estoqueMinimo = parseInt(config.valor, 10);
        }
      } catch {
        // Fallback para o valor padrão constante
      }
    }
    const estoqueMinimoFinal = estoqueMinimo !== undefined ? estoqueMinimo : DEFAULT_ESTOQUE_MINIMO;

    // 8. Cria o novo produto com os dados validados
    const newProduto = produtoRepo.create({
      nome: result.data.nome,
      categoria: result.data.categoria,
      quantidade: result.data.quantidade,
      estoqueMinimo: estoqueMinimoFinal,
      descricao: result.data.descricao ?? null,
      pacienteId: pacienteId,
    });

    // 9. Salva o produto no banco de dados
    const saved = await produtoRepo.save(newProduto);

    // 10. Registra LOG de auditoria para a criação
    const log = logRepo.create({
      produtoId: saved.id,
      pacienteId: pacienteId,
      usuarioId: user.userId,
      usuarioNome: nomeUsuario,
      acao: 'CRIACAO',
      campoAlterado: null,
      valorAnterior: null,
      valorNovo: `${saved.nome} | Categoria: ${saved.categoria} | Qtd: ${saved.quantidade} | Estoque Mín: ${saved.estoqueMinimo}`,
      descricao: `Produto "${saved.nome}" cadastrado por ${nomeUsuario} com ${saved.quantidade} unidade(s) na categoria "${saved.categoria}" e estoque mínimo de ${saved.estoqueMinimo} unidade(s).`,
    });
    await logRepo.save(log);

    // 11. Verifica se a quantidade está no limite mínimo personalizado → gera alerta + notificação
    let alerta = null;
    if (saved.quantidade <= saved.estoqueMinimo) {
      // 11a. Gera alerta na tabela alertas_estoque com snapshot do estoque mínimo personalizado
      const novoAlerta = alertaRepo.create({
        produtoId: saved.id,
        produtoNome: saved.nome,
        quantidade: saved.quantidade,
        estoqueMinimo: saved.estoqueMinimo,
        mensagem: `⚠️ ALERTA: O produto "${saved.nome}" foi cadastrado com apenas ${saved.quantidade} unidade(s). Estoque abaixo ou igual ao mínimo personalizado (${saved.estoqueMinimo}).`,
        lido: false,
      });
      alerta = await alertaRepo.save(novoAlerta);

      // 11b. Gera notificação para a equipe de enfermagem
      const notificacao = notificacaoRepo.create({
        tipo: 'ESTOQUE_BAIXO',
        titulo: `⚠️ Estoque baixo: ${saved.nome}`,
        mensagem: `O produto "${saved.nome}" foi cadastrado com apenas ${saved.quantidade} unidade(s), abaixo ou igual ao limite mínimo personalizado de ${saved.estoqueMinimo}. Por favor, providencie a reposição.`,
        destinatarioId: null,  // Broadcast para toda equipe
        referenciaTipo: 'produto',
        referenciaId: saved.id,
        lida: false,
      });
      await notificacaoRepo.save(notificacao);
    }

    // 11. Retorna o produto criado (e o alerta, se gerado)
    return Response.json(
      {
        success: true,
        message: alerta
          ? `Produto cadastrado com sucesso! ⚠️ Alerta: estoque baixo (${saved.quantidade} unidade(s)).`
          : 'Produto cadastrado com sucesso!',
        data: saved,
        alerta,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/estoque] Erro ao cadastrar produto:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao cadastrar produto.' },
      { status: 500 }
    );
  }
}
