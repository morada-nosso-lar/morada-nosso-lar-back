/**
 * ==============================================================================
 * API ROUTE: ESTOQUE — LISTAGEM E CADASTRO (src/app/api/estoque/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET  /api/estoque  → Lista todos os produtos do estoque (ordenados por created_at desc)
 *   POST /api/estoque  → Cadastra um novo produto no estoque
 *
 * AUTENTICAÇÃO:
 *   Ambos os endpoints exigem autenticação via JWT (cookie httpOnly ou header Bearer).
 *   Utiliza o helper getAuthenticatedUserFromRequest já existente no projeto.
 *
 * VALIDAÇÃO:
 *   O POST utiliza Zod (createProdutoSchema) para validar os dados de entrada.
 *
 * ALERTA AUTOMÁTICO:
 *   Ao cadastrar um produto com quantidade ≤ 2, um alerta é gerado automaticamente
 *   na tabela `alertas_estoque` e retornado junto com a resposta.
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidade Produto + AlertaEstoque).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { createProdutoSchema } from '@/lib/validations/estoque';
import { getDataSource } from '@/lib/database/data-source';
import { Produto } from '@/lib/database/entities/Produto';
import { AlertaEstoque } from '@/lib/database/entities/AlertaEstoque';

/** Limite mínimo de estoque — abaixo ou igual a esse valor, gera alerta */
const ESTOQUE_MINIMO = 2;

/**
 * GET /api/estoque
 *
 * Retorna a lista completa de produtos cadastrados no estoque.
 * Os produtos são ordenados por data de criação (mais recentes primeiro).
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "10 produto(s) encontrado(s).",
 *   "data": [ { id, nome, categoria, quantidade, descricao, createdAt, updatedAt }, ... ]
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

    // 3. Busca todos os produtos ordenados por data de criação (DESC)
    const produtos = await repo.find({
      order: { createdAt: 'DESC' },
    });

    // 4. Retorna a lista de produtos
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
 * Body esperado (JSON):
 * {
 *   "nome": "Papel Higiênico",
 *   "categoria": "Higiene",
 *   "quantidade": 10,
 *   "descricao": "Pacote com 12 rolos"   // opcional
 * }
 *
 * Resposta de sucesso (201):
 * {
 *   "success": true,
 *   "message": "Produto cadastrado com sucesso!",
 *   "data": { id, nome, categoria, quantidade, descricao, createdAt, updatedAt },
 *   "alerta": { ... } | null   // alerta gerado se quantidade ≤ 2
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

    // 5. Cria o novo produto com os dados validados
    const newProduto = produtoRepo.create({
      nome: result.data.nome,
      categoria: result.data.categoria,
      quantidade: result.data.quantidade,
      descricao: result.data.descricao ?? null,
    });

    // 6. Salva o produto no banco de dados
    const saved = await produtoRepo.save(newProduto);

    // 7. Verifica se a quantidade está no limite mínimo → gera alerta
    let alerta = null;
    if (saved.quantidade <= ESTOQUE_MINIMO) {
      const novoAlerta = alertaRepo.create({
        produtoId: saved.id,
        produtoNome: saved.nome,
        quantidade: saved.quantidade,
        mensagem: `⚠️ ALERTA: O produto "${saved.nome}" foi cadastrado com apenas ${saved.quantidade} unidade(s). Estoque abaixo do mínimo (${ESTOQUE_MINIMO}).`,
        lido: false,
      });
      alerta = await alertaRepo.save(novoAlerta);
    }

    // 8. Retorna o produto criado (e o alerta, se gerado)
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
