/**
 * ==============================================================================
 * VALIDAÇÃO DE ESTOQUE COM ZOD (src/lib/validations/estoque.ts)
 * ==============================================================================
 *
 * Schemas de validação para os dados de entrada das APIs de estoque.
 * Garante que os dados recebidos pelo backend estão no formato correto
 * antes de serem enviados ao banco de dados (Neon/TypeORM).
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   - A `categoria` agora é validada contra uma lista pré-definida de valores
 *   - Adicionado campo opcional `paciente_id` para vincular produto a um paciente
 *
 * REGRAS DE VALIDAÇÃO:
 *   - nome: obrigatório, entre 2 e 200 caracteres
 *   - categoria: obrigatório, deve ser uma das categorias pré-definidas
 *   - quantidade: obrigatório, número inteiro >= 0
 *   - descricao: opcional, máximo de 500 caracteres
 *   - paciente_id: opcional, número inteiro positivo
 */

import { z } from 'zod';
import { CATEGORIAS_VALIDAS } from '@/lib/constants/categorias';

/**
 * Schema de validação para CRIAÇÃO de um novo produto (POST).
 * Todos os campos obrigatórios devem estar presentes.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "O sistema deveria ter uma lista pré-definida de categorias
 *    (remédios; roupas; higiene pessoal....)"
 *   → A categoria agora é validada contra CATEGORIAS_VALIDAS.
 */
export const createProdutoSchema = z.object({
  /** Nome do produto — entre 2 e 200 caracteres */
  nome: z
    .string({ message: 'O nome do produto é obrigatório' })
    .trim()
    .min(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
    .max(200, { message: 'O nome não pode ter mais que 200 caracteres' }),

  /**
   * Categoria do produto — deve ser um dos valores da lista pré-definida.
   * Valores aceitos: 'Remédios', 'Roupas', 'Higiene Pessoal', 'Alimentos',
   *   'Material de Limpeza', 'Materiais Médicos', 'Cama, Mesa e Banho',
   *   'Utensílios Domésticos', 'Produtos de Enfermagem', 'Outros'
   */
  categoria: z
    .string({ message: 'A categoria é obrigatória' })
    .trim()
    .refine(
      (val) => (CATEGORIAS_VALIDAS as readonly string[]).includes(val),
      {
        message: `Categoria inválida. Valores aceitos: ${CATEGORIAS_VALIDAS.join(', ')}`,
      }
    ),

  /** Quantidade em estoque — número inteiro não negativo */
  quantidade: z
    .number({ message: 'A quantidade é obrigatória e deve ser um número' })
    .int({ message: 'A quantidade deve ser um número inteiro' })
    .min(0, { message: 'A quantidade não pode ser negativa' }),

  /**
   * Quantidade mínima personalizada em estoque para emissão de alertas.
   * Suporta tanto snake_case (estoque_minimo) quanto camelCase (estoqueMinimo).
   */
  estoque_minimo: z
    .number({ message: 'O estoque mínimo deve ser um número' })
    .int({ message: 'O estoque mínimo deve ser um número inteiro' })
    .min(0, { message: 'O estoque mínimo não pode ser negativo' })
    .optional(),

  estoqueMinimo: z
    .number({ message: 'O estoque mínimo deve ser um número' })
    .int({ message: 'O estoque mínimo deve ser um número inteiro' })
    .min(0, { message: 'O estoque mínimo não pode ser negativo' })
    .optional(),

  /** Descrição adicional do produto (opcional, máximo 500 caracteres) */
  descricao: z
    .string()
    .trim()
    .max(500, { message: 'A descrição não pode exceder 500 caracteres' })
    .nullable()
    .optional(),

  /**
   * ID do paciente vinculado (opcional).
   * Se informado, o produto será do estoque pessoal do paciente.
   * Se omitido ou null, o produto pertence ao estoque geral.
   */
  paciente_id: z
    .number()
    .int({ message: 'O ID do paciente deve ser um número inteiro' })
    .positive({ message: 'O ID do paciente deve ser positivo' })
    .nullable()
    .optional(),
});

/**
 * Schema de validação para ATUALIZAÇÃO de um produto existente (PUT).
 * Todos os campos são opcionais (atualização parcial com `.partial()`).
 * Porém, pelo menos um campo deve ser informado.
 *
 * NOTA (Sprint 04):
 *   "Não é possível editar um item cadastrado para um paciente,
 *    se o enfermeiro cadastrar algo por engano não é possível converter"
 *   → Itens vinculados a pacientes NÃO podem ter seus dados editados.
 *   Essa regra é aplicada na rota (route.ts), não no schema de validação.
 */
export const updateProdutoSchema = createProdutoSchema
  .omit({ paciente_id: true })  // Remove paciente_id da atualização (não pode trocar dono)
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'Pelo menos um campo deve ser informado para atualização' }
  );

// Inferência automática dos tipos a partir dos schemas Zod:
export type CreateProdutoZod = z.infer<typeof createProdutoSchema>;
export type UpdateProdutoZod = z.infer<typeof updateProdutoSchema>;
