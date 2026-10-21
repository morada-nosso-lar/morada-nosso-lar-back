/**
 * ==============================================================================
 * VALIDAÇÃO DE PACIENTES COM ZOD (src/lib/validations/paciente.ts)
 * ==============================================================================
 *
 * Schemas de validação para os dados de entrada das APIs de pacientes.
 * Garante que os dados recebidos pelo backend estão no formato correto
 * antes de serem enviados ao banco de dados.
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   - Adicionado campo `cpf` com validação pelo algoritmo oficial da Receita Federal
 *   - Adicionado schema para desativação de paciente
 *
 * REGRAS DE VALIDAÇÃO:
 *   - cpf: opcional; vazio, null ou ausente vira null. Se preenchido, 11 dígitos e dígitos verificadores válidos
 *   - nome_completo: obrigatório, entre 2 e 150 caracteres
 *   - data_nascimento: obrigatório, formato YYYY-MM-DD, não pode ser data futura
 *   - observacoes_medicas: opcional, máximo de 1000 caracteres
 */

import { z } from 'zod';
import { isValidCPF, sanitizeCPF } from './cpf';

/**
 * Schema de validação para CRIAÇÃO de um novo paciente (POST).
 * Todos os campos obrigatórios devem estar presentes.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Validar CPF, o sistema está deixando cadastrar documentos inválidos"
 *   → O CPF é validado pelo algoritmo oficial com dígitos verificadores.
 */
export const createPacienteSchema = z.object({
  /**
   * CPF do paciente — opcional.
   * "", null ou ausência viram null. Texto preenchido é sanitizado
   * (com ou sem pontuação) e validado pelo algoritmo dos dígitos verificadores.
   */
  cpf: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val): string | null => {
      if (val == null || val === '') return null;
      return sanitizeCPF(val);
    })
    .refine((val) => val === null || val.length === 11, {
      message: 'O CPF deve conter exatamente 11 dígitos numéricos',
    })
    .refine((val) => val === null || isValidCPF(val), {
      message: 'CPF inválido. Verifique os dígitos informados.',
    }),

  /** Nome completo do paciente — entre 2 e 150 caracteres */
  nome_completo: z
    .string({ message: 'O nome completo é obrigatório' })
    .trim()
    .min(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
    .max(150, { message: 'O nome não pode ter mais que 150 caracteres' }),

  /** Data de nascimento — formato YYYY-MM-DD, não pode ser futura */
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

  /** Observações médicas — campo opcional, máximo 1000 caracteres */
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
 *
 * NOTA: O CPF NÃO está incluído na atualização, pois é um documento
 * que não deve ser alterado após o cadastro.
 */
export const updatePacienteSchema = z.object({
  nome_completo: z
    .string()
    .trim()
    .min(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
    .max(150, { message: 'O nome não pode ter mais que 150 caracteres' })
    .optional(),

  data_nascimento: z
    .string()
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
    )
    .optional(),

  observacoes_medicas: z
    .string()
    .trim()
    .max(1000, { message: 'As observações não podem exceder 1000 caracteres' })
    .nullable()
    .optional(),
}).refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: 'Pelo menos um campo deve ser informado para atualização' }
);

/**
 * Schema de validação para DESATIVAÇÃO de um paciente (PATCH).
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "O sistema deve desativar pacientes, zerando seus estoques
 *    e não permitindo mais que haja qualquer tipo de movimentação com ele."
 *
 * O motivo da desativação é obrigatório para manter um registro
 * claro de por que o paciente foi removido do sistema ativo.
 */
export const desativarPacienteSchema = z.object({
  /** Motivo obrigatório para desativar o paciente (documentação) */
  motivo: z
    .string({ message: 'O motivo da desativação é obrigatório' })
    .trim()
    .min(5, { message: 'O motivo deve ter pelo menos 5 caracteres' })
    .max(500, { message: 'O motivo não pode exceder 500 caracteres' }),
});

// Inferência automática dos tipos a partir dos schemas Zod:
export type CreatePacienteZod = z.infer<typeof createPacienteSchema>;
export type UpdatePacienteZod = z.infer<typeof updatePacienteSchema>;
export type DesativarPacienteZod = z.infer<typeof desativarPacienteSchema>;
