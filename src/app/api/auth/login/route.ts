/**
 * ==============================================================================
 * ENDPOINT: POST /api/auth/login
 * ==============================================================================
 * 
 * OBJETIVO:
 * Autenticar o usuário verificando e-mail e senha com Bcrypt e emitindo
 * um Token JWT seguro enviado tanto no corpo da resposta quanto em um Cookie HttpOnly.
 * 
 * BOAS PRÁTICAS DE SEGURANÇA APLICADAS:
 * 1. Resposta genérica contra "User Enumeration": Caso o e-mail não exista OU
 *    a senha esteja errada, retornamos a MESMA mensagem de erro ("Credenciais inválidas").
 *    Isso impede que atacantes descubram quais e-mails estão cadastrados na base.
 * 2. Criptografia resistente a ataques de temporização (Timing Attacks) com Bcrypt.
 * 3. Cookie HttpOnly com SameSite para proteção contra roubo de sessão (XSS e CSRF).
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/auth';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { userRepository, sanitizeUser } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth/session';
import { AuthResponse, ApiErrorResponse } from '@/types/auth';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse | ApiErrorResponse>> {
  try {
    // 1. Tenta ler o corpo (JSON) da requisição
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Corpo da requisição inválido. Envie um JSON com e-mail e senha.' },
        { status: 400 }
      );
    }

    // 2. Validação dos campos com Zod
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: 'Dados de login inválidos',
          details: formattedErrors,
        },
        { status: 422 }
      );
    }

    const { email, password } = validationResult.data;

    // 3. Busca o usuário no banco pelo e-mail informado
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Mensagem propositalmente genérica por segurança
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 } // 401 Unauthorized
      );
    }

    // 4. Compara a senha digitada com o Hash salvo no banco usando Bcrypt
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    // 5. Gera o Token JWT com os dados de identificação do usuário
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // 6. Prepara os dados públicos do usuário (sem a senha)
    const safeUser = sanitizeUser(user);

    // 7. Monta a resposta HTTP de sucesso (status 200 OK)
    const response = NextResponse.json<AuthResponse>(
      {
        success: true,
        message: 'Login realizado com sucesso!',
        user: safeUser,
        token: token, // Enviado no JSON para clientes que preferem Bearer token (Mobile, etc.)
      },
      { status: 200 }
    );

    // 8. Anexa o Cookie HttpOnly seguro na resposta para navegadores Web
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error('[API Login] Erro interno:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ocorreu um erro interno no servidor ao tentar realizar o login.',
      },
      { status: 500 }
    );
  }
}
