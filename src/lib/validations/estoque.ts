/**
 * ==============================================================================
 * VALIDAÇÃO DE ESTOQUE COM ZOD (src/lib/validations/estoque.ts)
 * ==============================================================================
 *
 * Schemas de validação para os dados de entrada das APIs de estoque.
 * Garante que os dados recebidos pelo backend estão no formato correto
 * antes de serem enviados ao banco de dados (Neon/TypeORM).
 *
 * REGRAS DE VALIDAÇÃO:
 * - nome: obrigatório, entre 2 e 200 caracteres
 * - categoria: obrigatório, entre 2 e 100 caracteres
 * - quantidade: obrigatório, número inteiro >= 0
 * - descricao: opcional, máximo de 500 caracteres
 */

import { z } from 'zod';

/**
 * Schema de validação para CRIAÇÃO de um novo produto (POST).
 * Todos os campos obrigatórios devem estar presentes.
 */
export const createProdutoSchema = z.object({
  nome: z
    .string({ message: 'O nome do produto é obrigatório' })
    .trim()
    .min(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
    .max(200, { message: 'O nome não pode ter mais que 200 caracteres' }),

  categoria: z
    .string({ message: 'A categoria é obrigatória' })
    .trim()
    .min(2, { message: 'A categoria deve ter pelo menos 2 caracteres' })
    .max(100, { message: 'A categoria não pode ter mais que 100 caracteres' }),

  quantidade: z
    .number({ message: 'A quantidade é obrigatória e deve ser um número' })
    .int({ message: 'A quantidade deve ser um número inteiro' })
    .min(0, { message: 'A quantidade não pode ser negativa' }),

  descricao: z
    .string()
    .trim()
    .max(500, { message: 'A descrição não pode exceder 500 caracteres' })
    .nullable()
    .optional(),
});

/**
 * Schema de validação para ATUALIZAÇÃO de um produto existente (PUT).
 * Todos os campos são opcionais (atualização parcial com `.partial()`).
 * Porém, pelo menos um campo deve ser informado.
 */
export const updateProdutoSchema = createProdutoSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'Pelo menos um campo deve ser informado para atualização' }
  );

// Inferência automática dos tipos a partir dos schemas Zod:
export type CreateProdutoZod = z.infer<typeof createProdutoSchema>;
export type UpdateProdutoZod = z.infer<typeof updateProdutoSchema>;
