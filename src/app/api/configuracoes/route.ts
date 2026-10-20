/**
 * ==============================================================================
 * API ROUTE: CONFIGURAÇÕES DO SISTEMA — LISTAGEM E INICIALIZAÇÃO
 * (src/app/api/configuracoes/route.ts)
 * ==============================================================================
 *
 * Endpoints:
 *   GET  /api/configuracoes → Lista todas as configurações do sistema
 *   POST /api/configuracoes → Inicializa/reseta as configurações padrão
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Não consegui alterar nenhuma Configuração"
 *   → Este endpoint permite ler e gerenciar configurações do sistema.
 *
 * CONFIGURAÇÕES PADRÃO DO SISTEMA:
 *   - estoque_minimo: Quantidade mínima antes de gerar alerta (padrão: 2)
 *   - nome_instituicao: Nome da instituição (padrão: "Morada Nosso Lar")
 *   - notificacoes_ativas: Se notificações automáticas estão habilitadas (padrão: true)
 *   - itens_padrao_paciente: Quantidade de itens iniciais ao cadastrar paciente (padrão: 3)
 *
 * AUTENTICAÇÃO:
 *   Ambos os endpoints exigem autenticação via JWT.
 *
 * BANCO DE DADOS:
 *   Neon PostgreSQL via TypeORM (entidade Configuracao).
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/session';
import { getDataSource } from '@/lib/database/data-source';
import { Configuracao } from '@/lib/database/entities/Configuracao';

/**
 * Lista de configurações padrão do sistema.
 * Usada para inicializar ou resetar as configurações.
 */
const CONFIGURACOES_PADRAO = [
  {
    chave: 'estoque_minimo',
    valor: '2',
    descricao: 'Quantidade mínima de estoque antes de gerar alerta automático.',
  },
  {
    chave: 'nome_instituicao',
    valor: 'Morada Nosso Lar',
    descricao: 'Nome da instituição exibido no sistema.',
  },
  {
    chave: 'notificacoes_ativas',
    valor: 'true',
    descricao: 'Habilita ou desabilita as notificações automáticas do sistema (true/false).',
  },
  {
    chave: 'itens_padrao_paciente',
    valor: '3',
    descricao: 'Quantidade de itens padrão criados automaticamente ao cadastrar um novo paciente.',
  },
  {
    chave: 'permitir_exclusao_estoque_geral',
    valor: 'true',
    descricao: 'Permite ou bloqueia a exclusão de produtos do estoque geral (true/false).',
  },
];

/**
 * GET /api/configuracoes
 *
 * Retorna todas as configurações do sistema.
 * Se nenhuma configuração existir, inicializa com os valores padrão.
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "5 configuração(ões) encontrada(s).",
 *   "data": [
 *     {
 *       "id": 1,
 *       "chave": "estoque_minimo",
 *       "valor": "2",
 *       "descricao": "Quantidade mínima de estoque...",
 *       "createdAt": "...",
 *       "updatedAt": "..."
 *     },
 *     ...
 *   ]
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
    const repo = ds.getRepository(Configuracao);

    // 3. Busca todas as configurações
    let configuracoes = await repo.find({
      order: { chave: 'ASC' },
    });

    // 4. Se não existem configurações, inicializa com os valores padrão
    if (configuracoes.length === 0) {
      for (const configPadrao of CONFIGURACOES_PADRAO) {
        const novaConfig = repo.create(configPadrao);
        await repo.save(novaConfig);
      }
      // Busca novamente após inicialização
      configuracoes = await repo.find({
        order: { chave: 'ASC' },
      });
    }

    // 5. Retorna as configurações
    return Response.json({
      success: true,
      message: `${configuracoes.length} configuração(ões) encontrada(s).`,
      data: configuracoes,
    });
  } catch (error) {
    console.error('[GET /api/configuracoes] Erro ao buscar configurações:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao buscar configurações.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/configuracoes
 *
 * Inicializa ou reseta as configurações do sistema para os valores padrão.
 * Configurações existentes NÃO são sobrescritas (apenas novas são criadas).
 *
 * Resposta de sucesso (200):
 * {
 *   "success": true,
 *   "message": "Configurações inicializadas com sucesso. 5 configuração(ões) no total.",
 *   "data": [ ... ]
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

  try {
    // 2. Obtém a conexão com o banco de dados
    const ds = await getDataSource();
    const repo = ds.getRepository(Configuracao);

    // 3. Para cada configuração padrão, cria apenas se não existir
    let criadas = 0;
    for (const configPadrao of CONFIGURACOES_PADRAO) {
      const existente = await repo.findOneBy({ chave: configPadrao.chave });
      if (!existente) {
        const novaConfig = repo.create(configPadrao);
        await repo.save(novaConfig);
        criadas++;
      }
    }

    // 4. Busca todas as configurações atualizadas
    const configuracoes = await repo.find({
      order: { chave: 'ASC' },
    });

    return Response.json({
      success: true,
      message: `Configurações inicializadas com sucesso. ${criadas} nova(s) criada(s). ${configuracoes.length} configuração(ões) no total.`,
      data: configuracoes,
    });
  } catch (error) {
    console.error('[POST /api/configuracoes] Erro ao inicializar configurações:', error);
    return Response.json(
      { success: false, error: 'Erro interno ao inicializar configurações.' },
      { status: 500 }
    );
  }
}
