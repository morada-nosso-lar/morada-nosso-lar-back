/**
 * ==============================================================================
 * GERENCIAMENTO DE TOKENS JWT (src/lib/auth/jwt.ts)
 * ==============================================================================
 * 
 * O QUE É O JWT (JSON WEB TOKEN)?
 * -------------------------------
 * O JWT é um padrão aberto (RFC 7519) que define uma forma compacta e autocontida 
 * de transmitir com segurança informações entre partes como um objeto JSON.
 * 
 * ESTRUTURA DE UM JWT (Separado por pontos `.`):
 * 1. HEADER (Cabeçalho):
 *    Informa o tipo do token ("JWT") e o algoritmo de criptografia (ex: "HS256").
 * 2. PAYLOAD (Carga útil):
 *    Contém os dados que queremos transportar (ex: ID do usuário, email, data de expiração).
 * 3. SIGNATURE (Assinatura):
 *    É o resultado de pegar o Header + Payload + Segredo do Servidor e aplicar o algoritmo de hash.
 *    A assinatura garante que NINGUÉM no meio do caminho alterou o conteúdo do token.
 * 
 * POR QUE O JWT É "STATELESS"?
 * Ao contrário das sessões tradicionais onde o servidor precisa salvar uma tabela de 
 * sessões ativas no banco/Redis, com JWT o próprio token carrega as credenciais e a 
 * assinatura válida. O servidor apenas valida a assinatura com a sua chave secreta!
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '@/types/auth';

// Chave secreta obtida das variáveis de ambiente (.env.local).
// Caso não esteja definida (ex: esquecimento em desenvolvimento), usamos um fallback seguro.
const JWT_SECRET = process.env.JWT_SECRET || 'moradanossolar_chave_secreta_padrao_desenvolvimento';

// Tempo padrão de expiração do token (7 dias)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Cria e assina um novo Token JWT para um usuário autenticado.
 * 
 * @param payload - Os dados do usuário a serem incluídos no token (ex: userId, email)
 * @param expiresIn - Opcional: tempo customizado para expirar (ex: '1h', '24h', '7d')
 * @returns String contendo o token JWT completo no formato "header.payload.signature"
 */
export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn?: string | number
): string {
  const options: SignOptions = {
    // Define o tempo até a expiração
    expiresIn: (expiresIn || JWT_EXPIRES_IN) as unknown as SignOptions['expiresIn'],
    // Algoritmo HMAC SHA-256 padrão
    algorithm: 'HS256',
  };

  // jwt.sign() junta o payload, a chave secreta e as opções e produz a string do token
  const token = jwt.sign(payload, JWT_SECRET, options);

  return token;
}

/**
 * Valida a assinatura de um token JWT e extrai seu conteúdo (Payload).
 * 
 * O que esta função faz:
 * 1. Verifica se o token foi realmente assinado com a nossa `JWT_SECRET`.
 * 2. Verifica se o token ainda está dentro da data/hora de validade (não expirou).
 * 3. Retorna o objeto payload se tudo estiver correto, ou `null` se o token for inválido/expirado.
 * 
 * @param token - A string do JWT recebida via cabeçalho Authorization ou Cookie
 * @returns O payload decodificado (JWTPayload) ou null se o token for inválido
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    // jwt.verify lança um erro automaticamente se a assinatura for inválida ou o token estiver expirado
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    // Pode ocorrer TokenExpiredError (token expirou) ou JsonWebTokenError (assinatura inválida)
    console.warn('[JWT] Falha ao verificar token:', error instanceof Error ? error.message : error);
    return null;
  }
}
