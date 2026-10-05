/**
 * ==============================================================================
 * TIPOS E INTERFACES DE ESTOQUE (src/types/estoque.ts)
 * ==============================================================================
 *
 * Define a estrutura de dados dos Produtos/Suprimentos e Alertas de Estoque
 * em diferentes contextos:
 * - Produto: registro completo vindo do banco de dados (Neon/TypeORM)
 * - AlertaEstoque: registro de alerta de estoque baixo
 * - CreateProdutoInput: dados enviados pelo cliente ao cadastrar
 * - UpdateProdutoInput: dados enviados pelo cliente ao editar (parcial)
 *
 * NOTA: Os campos usam camelCase no TypeScript. O TypeORM cuida do mapeamento
 * para snake_case nas colunas do banco de dados automaticamente via entidades.
 */

/**
 * Representa a estrutura completa do Produto retornada pelas APIs.
 * Corresponde à entidade `Produto` do TypeORM (tabela `produtos`).
 */
export interface Produto {
  id: number;                // Inteiro auto-increment
  nome: string;              // Nome do produto/suprimento (obrigatório)
  categoria: string;         // Categoria do produto (obrigatório)
  quantidade: number;        // Quantidade disponível em estoque
  descricao: string | null;  // Descrição adicional (opcional)
  createdAt: Date;           // Timestamp de criação
  updatedAt: Date;           // Timestamp da última atualização
}

/**
 * Dados necessários para criar um novo produto.
 */
export interface CreateProdutoInput {
  nome: string;
  categoria: string;
  quantidade: number;
  descricao?: string | null;
}

/**
 * Dados aceitos para atualizar um produto existente.
 * Todos os campos são opcionais (atualização parcial).
 */
export interface UpdateProdutoInput {
  nome?: string;
  categoria?: string;
  quantidade?: number;
  descricao?: string | null;
}

/**
 * Representa um alerta de estoque baixo.
 * Gerado automaticamente quando a quantidade de um produto atinge ≤ 2 unidades.
 */
export interface AlertaEstoque {
  id: number;
  produtoId: number;
  produtoNome: string;       // Nome do produto no momento do alerta (snapshot)
  quantidade: number;        // Quantidade no momento do alerta
  mensagem: string;          // Mensagem descritiva do alerta
  lido: boolean;             // Se o alerta já foi visualizado/resolvido
  createdAt: Date;
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
