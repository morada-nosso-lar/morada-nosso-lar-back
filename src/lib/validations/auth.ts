/**
 * ==============================================================================
 * VALIDAÇÃO DE ENTRADAS COM ZOD (src/lib/validations/auth.ts)
 * ==============================================================================
 * 
 * O QUE É O ZOD?
 * --------------
 * O Zod é uma biblioteca de declaração e validação de esquemas (schemas) 
 * com foco total em TypeScript.
 * 
 * POR QUE A VALIDAÇÃO DE DADOS É OBRIGATÓRIA NO BACKEND?
 * 1. NUNCA confie nos dados enviados pelo cliente/frontend. Um atacante pode burlar 
 *    qualquer validação do navegador e enviar requisições diretas via Postman, cURL ou scripts.
 * 2. Previne falhas de injeção, tipos incorretos (ex: passar um número onde se espera string)
 *    e dados maliciosos ou vazios.
 * 3. Garante que os dados que chegam às nossas funções de negócio estão 100% limpos e no formato correto.
 * 4. Fornece mensagens de erro automáticas e amigáveis para o cliente.
 */

import { z } from 'zod';

/**
 * Esquema de Validação para Registro de Novo Usuário (Cadastro)
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
    .max(100, { message: 'O nome não pode ter mais que 100 caracteres' }),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Formato de e-mail inválido' }),

  password: z
    .string()
    .min(6, { message: 'A senha deve conter no mínimo 6 caracteres' })
    .max(72, { message: 'A senha não pode exceder 72 caracteres' }), // Limite do algoritmo bcrypt
});

/**
 * Esquema de Validação para Autenticação (Login)
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Informe um e-mail válido' }),

  password: z
    .string()
    .min(1, { message: 'A senha é obrigatória' }),
});

// Inferência de tipos automática do TypeScript a partir dos schemas Zod:
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
