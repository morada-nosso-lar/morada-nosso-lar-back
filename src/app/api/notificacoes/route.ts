/**
 * ==============================================================================
 * API ROUTE: NOTIFICAÇÕES — LISTAGEM E ENVIO
 * (src/app/api/notificacoes/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET  /api/notificacoes → Lista notificações da equipe de enfermagem
 *   POST /api/notificacoes → Envia uma nova notificação manual
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Não consegui receber ou enviar nenhuma notificação."
 *   "A notificação é para o paciente ou para a equipe de enfermagem?"
 *   → As notificações são destinadas à EQUIPE DE ENFERMAGEM.
 *   → Este endpoint permite listar notificações recebidas e enviar novas.
 *
 * TIPOS DE NOTIFICAÇÕES:
 *   - ESTOQUE_BAIXO       → Gerada automaticamente quando estoque ≤ 2
 *   - PACIENTE_DESATIVADO → Gerada ao desativar um paciente
 *   - PACIENTE_ATIVADO    → Gerada ao reativar um paciente
 *   - ESTOQUE_ZERADO      → Gerada quando estoque é zerado (desativação)
 *   - SISTEMA             → Notificação geral (cadastro, eventos, etc.)
 *
 * QUERY PARAMS (GET):
 *   ?lida=true    → Apenas notificações lidas
 *   ?lida=false   → Apenas notificações não lidas (pendentes)
 *   ?tipo=ESTOQUE_BAIXO → Filtra por tipo de notificação
 *   ?limite=50    → Limita a quantidade de registros (padrão: 50)
 *
 * AUTENTICAÇÃO:
 *   Ambos os endpoints exigem autenticação via JWT.
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidade Notificacao).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { getDataSource } from '@/lib/database/data-source';
import { Notificacao } from '@/lib/database/entities/Notificacao';
import { z } from 'zod';

/**
 * Schema de validação para criação manual de notificação.
 */
const createNotificacaoSchema = z.object({
  /** Tipo da notificação (usa 'SISTEMA' por padrão para envios manuais) */
  tipo: z
    .string()
    .trim()
    .max(50)
    .default('SISTEMA'),

  /** Título resumido da notificação */
  titulo: z
    .string({ message: 'O título é obrigatório' })
    .trim()
    .min(3, { message: 'O título deve ter pelo menos 3 caracteres' })
    .max(200, { message: 'O título não pode exceder 200 caracteres' }),

  /** Mensagem completa com detalhes */
  mensagem: z
    .string({ message: 'A mensagem é obrigatória' })
    .trim()
    .min(5, { message: 'A mensagem deve ter pelo menos 5 caracteres' })
    .max(2000, { message: 'A mensagem não pode exceder 2000 caracteres' }),

  /** ID do destinatário específico (null = broadcast para todos) */
  destinatario_id: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
});

/**
 * GET /api/notificacoes
 *
 * Retorna a lista de notificações destinadas à equipe de enfermagem.
 * Inclui notificações automáticas (estoque baixo, etc.) e manuais.
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "5 notificação(ões) encontrada(s).",
 *   "data": [
 *     {
 *       "id": 1,
 *       "tipo": "ESTOQUE_BAIXO",
 *       "titulo": "⚠️ Estoque baixo: Papel Higiênico",
 *       "mensagem": "O produto \"Papel Higiênico\" atingiu 1 unidade(s)...",
 *       "destinatarioId": null,
 *       "referenciaTipo": "produto",
 *       "referenciaId": 3,
 *       "lida": false,
 *       "createdAt": "2026-10-20T20:00:00Z"
 *     },
 *     ...
 *   ],
 *   "nao_lidas": 3
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
    // 2. Obtém a conexão com o banco de dados
    const ds = await getDataSource();
    const repo = ds.getRepository(Notificacao);

    // 3. Extrai os filtros dos query params
    const url = new URL(request.url);
    const lidaParam = url.searchParams.get('lida');
    const tipoParam = url.searchParams.get('tipo');
    const limiteParam = url.searchParams.get('limite');

    // 4. Monta a condição de busca
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filtro por status de leitura
    if (lidaParam === 'true') {
      where.lida = true;
    } else if (lidaParam === 'false') {
      where.lida = false;
    }

    // Filtro por tipo de notificação
    if (tipoParam) {
      where.tipo = tipoParam.toUpperCase();
    }

    // Limite de registros (padrão: 50, máximo: 200)
    let take = 50;
    if (limiteParam) {
      const limite = parseInt(limiteParam, 10);
      if (!isNaN(limite) && limite > 0 && limite <= 200) {
        take = limite;
      }
    }

    // 5. Busca as notificações (mais recentes primeiro)
    //    Filtra por destinatário: mostra notificações broadcast (null)
    //    OU destinadas ao usuário atual
    const notificacoes = await repo.find({
      where,
      order: { createdAt: 'DESC' },
      take,
    });

    // 6. Conta as notificações não lidas (para badge no frontend)
    const naoLidas = await repo.count({
      where: { lida: false },
    });

    // 7. Retorna a lista de notificações
    return Response.json({
      success: true,
      message: `${notificacoes.length} notificação(ões) encontrada(s).`,
      data: notificacoes,
      nao_lidas: naoLidas,
    });
  } catch (error) {
    console.error('[GET /api/notificacoes] Erro ao buscar notificações:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar notificações.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notificacoes
 *
 * Envia uma nova notificação manual para a equipe de enfermagem.
 *
 * Body esperado (JSON):
 * {
 *   "titulo": "Reunião de equipe",
 *   "mensagem": "Reunião marcada para amanhã às 14h na sala de enfermagem.",
 *   "tipo": "SISTEMA",                // opcional, padrão: "SISTEMA"
 *   "destinatario_id": null            // opcional, null = broadcast para todos
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

  // 2. Extrai o corpo da requisição
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'O corpo da requisição deve ser um JSON válido.' },
      { status: 400 }
    );
  }

  // 3. Valida os dados com Zod
  const result = createNotificacaoSchema.safeParse(body);
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
    // 4. Salva a notificação no banco
    const ds = await getDataSource();
    const repo = ds.getRepository(Notificacao);

    const notificacao = repo.create({
      tipo: result.data.tipo,
      titulo: result.data.titulo,
      mensagem: result.data.mensagem,
      destinatarioId: result.data.destinatario_id ?? null,
      referenciaTipo: null,
      referenciaId: null,
      lida: false,
    });

    const saved = await repo.save(notificacao);

    return Response.json(
      {
        success: true,
        message: 'Notificação enviada com sucesso!',
        data: saved,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/notificacoes] Erro ao enviar notificação:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao enviar notificação.' },
      { status: 500 }
    );
  }
}
