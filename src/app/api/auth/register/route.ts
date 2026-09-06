/**
 * ==============================================================================
 * ENDPOINT: POST /api/auth/register
 * ==============================================================================
 * 
 * OBJETIVO:
 * Cadastrar um novo usuário no sistema com validação rigorosa de dados (Zod)
 * e criptografia irreversível de senha com Salt (Bcrypt).
 * 
 * FLUXO DE EXECUÇÃO:
 * 1. Recebe a requisição HTTP com o corpo (Body) em formato JSON.
 * 2. Valida o formato dos dados (nome, email e senha) através do Zod.
 * 3. Verifica se já existe uma conta cadastrada com este mesmo e-mail.
 * 4. Aplica hash criptográfico na senha usando Bcrypt (gera salt + hash).
 * 5. Salva o novo usuário na base de dados com a senha protegida.
 * 6. Retorna os dados seguros do usuário (sem a senha) com status HTTP 201 (Created).
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth/password';
import { userRepository, sanitizeUser } from '@/lib/db';
import { AuthResponse, ApiErrorResponse } from '@/types/auth';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse | ApiErrorResponse>> {
  try {
    // 1. Tenta ler o corpo (JSON) da requisição
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corpo da requisição inválido. Envie um JSON válido.' },
        { status: 400 }
      );
    }

    // 2. Validação dos dados de entrada com Zod
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      // Extrai os erros de validação formatados para o cliente
      const formattedErrors = validationResult.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: 'Dados de cadastro inválidos',
          details: formattedErrors,
        },
        { status: 422 } // 422 Unprocessable Entity
      );
    }

    const { name, email, password } = validationResult.data;

    // 3. Verifica se o e-mail já está em uso por outro usuário
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este endereço de e-mail já está cadastrado no sistema.',
        },
        { status: 409 } // 409 Conflict
      );
    }

    // 4. Criptografa a senha com Bcrypt (Gera Salt + Hash)
    const passwordHash = await hashPassword(password);

    // 5. Cria e salva o usuário no banco de dados
    const newUser = await userRepository.create({
      name,
      email,
      passwordHash,
    });

    // 6. Remove a senha do objeto de resposta por motivos de segurança
    const safeUser = sanitizeUser(newUser);

    // Retorna resposta de sucesso com status 201 (Created)
    return NextResponse.json(
      {
        success: true,
        message: 'Usuário cadastrado com sucesso!',
        user: safeUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Register] Erro interno:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocorreu um erro interno no servidor ao processar o cadastro.',
      },
      { status: 500 }
    );
  }
}
