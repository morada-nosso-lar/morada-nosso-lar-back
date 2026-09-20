/**
 * ==============================================================================
 * VALIDAÇÃO DE PACIENTES COM ZOD (src/lib/validations/paciente.ts)
 * ==============================================================================
 *
 * Schemas de validação para os dados de entrada das APIs de pacientes.
 * Garante que os dados recebidos pelo backend estão no formato correto
 * antes de serem enviados ao banco de dados (Supabase).
 *
 * REGRAS DE VALIDAÇÃO:
 * - nome_completo: obrigatório, entre 2 e 150 caracteres
 * - data_nascimento: obrigatório, formato YYYY-MM-DD, não pode ser data futura
 * - observacoes_medicas: opcional, máximo de 1000 caracteres
 */

import { z } from 'zod';

/**
 * Schema de validação para CRIAÇÃO de um novo paciente (POST).
 * Todos os campos obrigatórios devem estar presentes.
 */
export const createPacienteSchema = z.object({
  nome_completo: z
    .string({ message: 'O nome completo é obrigatório' })
    .trim()
    .min(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
    .max(150, { message: 'O nome não pode ter mais que 150 caracteres' }),

  data_nascimento: z
    .string({ message: 'A data de nascimento é obrigatória' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'A data de nascimento deve estar no formato YYYY-MM-DD',
    })
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
      },
      { message: 'Data de nascimento inválida' }
    )
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date <= today;
      },
      { message: 'A data de nascimento não pode ser uma data futura' }
    ),

  observacoes_medicas: z
    .string()
    .trim()
    .max(1000, { message: 'As observações não podem exceder 1000 caracteres' })
    .nullable()
    .optional(),
});

/**
 * Schema de validação para ATUALIZAÇÃO de um paciente existente (PUT).
 * Todos os campos são opcionais (atualização parcial com `.partial()`).
 * Porém, pelo menos um campo deve ser informado.
 */
export const updatePacienteSchema = createPacienteSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'Pelo menos um campo deve ser informado para atualização' }
  );

// Inferência automática dos tipos a partir dos schemas Zod:
export type CreatePacienteZod = z.infer<typeof createPacienteSchema>;
export type UpdatePacienteZod = z.infer<typeof updatePacienteSchema>;
