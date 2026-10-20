/**
 * ==============================================================================
 * CATEGORIAS PRÉ-DEFINIDAS DO SISTEMA (src/lib/constants/categorias.ts)
 * ==============================================================================
 *
 * Define a lista oficial de categorias aceitas pelo sistema de estoque.
 * Essa lista padroniza os tipos de itens que podem ser cadastrados,
 * evitando categorias duplicadas ou inconsistentes.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   O sistema deveria ter uma lista pré-definida de categorias
 *   (remédios, roupas, higiene pessoal, etc.).
 *
 * COMO ADICIONAR NOVAS CATEGORIAS:
 *   1. Adicione o valor no array CATEGORIAS_VALIDAS abaixo
 *   2. O tipo CategoriaValida é inferido automaticamente
 *   3. A validação Zod (estoque.ts) usa essa lista para rejeitar valores inválidos
 */

/**
 * Lista oficial de categorias aceitas no sistema de estoque.
 * Usada na validação Zod e retornada via API GET /api/categorias.
 *
 * IMPORTANTE: Use `as const` para que o TypeScript infira os valores literais
 * e permita a criação do tipo CategoriaValida automaticamente.
 */
export const CATEGORIAS_VALIDAS = [
  'Remédios',
  'Roupas',
  'Higiene Pessoal',
  'Alimentos',
  'Material de Limpeza',
  'Materiais Médicos',
  'Cama, Mesa e Banho',
  'Utensílios Domésticos',
  'Produtos de Enfermagem',
  'Outros',
] as const;

/**
 * Tipo literal derivado da lista de categorias válidas.
 * Garante type-safety: apenas valores da lista são aceitos.
 *
 * Exemplo: CategoriaValida = 'Remédios' | 'Roupas' | 'Higiene Pessoal' | ...
 */
export type CategoriaValida = (typeof CATEGORIAS_VALIDAS)[number];

/**
 * Itens padrão que todo novo paciente recebe automaticamente ao ser cadastrado.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Ao cadastrar novos pacientes eles já são iniciados como 3 itens no estoque."
 *
 * Cada item possui:
 *   - nome: Nome do produto padrão
 *   - categoria: Categoria pré-definida (deve ser da lista CATEGORIAS_VALIDAS)
 *   - quantidade: Quantidade inicial no estoque do paciente
 *   - descricao: Descrição opcional do item
 */
export const ITENS_PADRAO_PACIENTE = [
  {
    nome: 'Kit de Higiene Pessoal',
    categoria: 'Higiene Pessoal' as CategoriaValida,
    quantidade: 1,
    descricao: 'Kit básico contendo escova de dente, pasta de dente, sabonete e shampoo.',
  },
  {
    nome: 'Jogo de Roupas de Cama',
    categoria: 'Cama, Mesa e Banho' as CategoriaValida,
    quantidade: 1,
    descricao: 'Jogo com lençol, fronha e cobertor.',
  },
  {
    nome: 'Kit de Vestuário Básico',
    categoria: 'Roupas' as CategoriaValida,
    quantidade: 1,
    descricao: 'Conjunto de roupas básicas para uso diário na instituição.',
  },
] as const;
