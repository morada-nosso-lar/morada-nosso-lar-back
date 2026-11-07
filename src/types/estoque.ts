/**
 * ==============================================================================
 * TIPOS E INTERFACES DE ESTOQUE (src/types/estoque.ts)
 * ==============================================================================
 *
 * Define a estrutura de dados dos Produtos/Suprimentos, Alertas de Estoque
 * e LOGs de auditoria em diferentes contextos.
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   - Adicionado campo `pacienteId` ao Produto (vínculo com paciente)
 *   - Adicionada interface LogEstoque para auditoria
 *   - Adicionada interface Notificacao para equipe de enfermagem
 *   - Adicionada interface Configuracao para settings do sistema
 *
 * NOTA: Os campos usam camelCase no TypeScript. O TypeORM cuida do mapeamento
 * para snake_case nas colunas do banco de dados automaticamente via entidades.
 */

/**
 * Representa a estrutura completa do Produto retornada pelas APIs.
 * Corresponde à entidade `Produto` do TypeORM (tabela `produtos`).
 */
export interface Produto {
  id: number;                 // Inteiro auto-increment
  nome: string;               // Nome do produto/suprimento (obrigatório)
  categoria: string;          // Categoria do produto (lista pré-definida)
  quantidade: number;         // Quantidade disponível em estoque
  estoqueMinimo: number;      // Quantidade mínima personalizada para alertas
  descricao: string | null;   // Descrição adicional (opcional)
  pacienteId: number | null;  // ID do paciente vinculado (null = estoque geral)
  createdAt: Date;            // Timestamp de criação
  updatedAt: Date;            // Timestamp da última atualização
}

/**
 * Dados necessários para criar um novo produto.
 */
export interface CreateProdutoInput {
  nome: string;
  categoria: string;
  quantidade: number;
  estoque_minimo?: number;
  estoqueMinimo?: number;
  descricao?: string | null;
  pacienteId?: number | null;
}

/**
 * Dados aceitos para atualizar um produto existente.
 * Todos os campos são opcionais (atualização parcial).
 * NOTA: paciente_id NÃO pode ser alterado (não pode trocar dono).
 */
export interface UpdateProdutoInput {
  nome?: string;
  categoria?: string;
  quantidade?: number;
  estoque_minimo?: number;
  estoqueMinimo?: number;
  descricao?: string | null;
}

/**
 * Representa um alerta de estoque baixo.
 * Gerado automaticamente quando a quantidade de um produto atinge o estoque mínimo personalizado.
 */
export interface AlertaEstoque {
  id: number;
  produtoId: number;
  produtoNome: string;        // Nome do produto no momento do alerta (snapshot)
  quantidade: number;         // Quantidade no momento do alerta
  estoqueMinimo?: number | null; // Limite mínimo no momento do alerta
  mensagem: string;           // Mensagem descritiva do alerta
  lido: boolean;              // Se o alerta já foi visualizado/resolvido
  createdAt: Date;
}

/**
 * Representa um LOG de auditoria de operações no estoque.
 * Gerado automaticamente a cada criação, edição ou exclusão de produto.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Sempre que falamos em edição em sistemas de estoque também falamos
 *    em criação de LOGs para saber que editou."
 */
export interface LogEstoque {
  id: number;
  produtoId: number | null;    // ID do produto afetado (null se excluído)
  pacienteId: number | null;   // ID do paciente relacionado (se aplicável)
  usuarioId: number;           // ID do usuário que fez a ação
  usuarioNome: string;         // Nome do usuário (snapshot)
  acao: string;                // Tipo de ação (CRIACAO, ATUALIZACAO_QTD, etc.)
  campoAlterado: string | null; // Campo alterado (ex: 'quantidade', 'nome')
  valorAnterior: string | null; // Valor antes da alteração
  valorNovo: string | null;     // Valor após a alteração
  descricao: string;           // Descrição legível da ação
  createdAt: Date;
}

/**
 * Representa uma notificação para a equipe de enfermagem.
 */
export interface Notificacao {
  id: number;
  tipo: string;                     // Tipo da notificação (ESTOQUE_BAIXO, PACIENTE_DESATIVADO, etc.)
  titulo: string;                   // Título resumido
  mensagem: string;                 // Mensagem completa
  destinatarioId: number | null;    // ID do destinatário (null = broadcast)
  referenciaTipo: string | null;    // Tipo da entidade referenciada
  referenciaId: number | null;      // ID da entidade referenciada
  lida: boolean;                    // Se já foi lida
  createdAt: Date;
}

/**
 * Representa uma configuração do sistema (chave-valor).
 */
export interface Configuracao {
  id: number;
  chave: string;               // Chave única da configuração
  valor: string;               // Valor da configuração (string)
  descricao: string | null;    // Descrição do propósito
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Estrutura padrão de resposta de sucesso da API de estoque.
 */
export interface EstoqueApiResponse {
  success: boolean;
  message: string;
  data?: Produto | Produto[];
}

/**
 * Estrutura padrão de resposta da API de alertas de estoque.
 */
export interface AlertaApiResponse {
  success: boolean;
  message: string;
  data?: AlertaEstoque | AlertaEstoque[];
}

/**
 * Estrutura padrão de resposta da API de logs de estoque.
 */
export interface LogApiResponse {
  success: boolean;
  message: string;
  data?: LogEstoque | LogEstoque[];
}
