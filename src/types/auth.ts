/**
 * ==============================================================================
 * TIPOS E INTERFACES DE AUTENTICAÇÃO (src/types/auth.ts)
 * ==============================================================================
 * O TypeScript nos permite definir a "forma" (estrutura) dos nossos dados.
 * Isso previne erros comuns durante o desenvolvimento (ex: acessar propriedades
 * inexistentes ou passar tipos incompatíveis).
 */

/**
 * Representa a estrutura completa do Usuário no banco de dados.
 * ATENÇÃO: Contém o campo `passwordHash`, que NUNCA deve ser enviado
 * nas respostas de API para o frontend/cliente.
 *
 * NOTA: O `id` agora é um número inteiro auto-incrementado (SERIAL).
 */
export interface User {
  id: number;             // Identificador único do usuário (inteiro auto-increment)
  name: string;           // Nome completo ou apelido do usuário
  email: string;          // E-mail único usado para login
  passwordHash: string;   // Senha criptografada (hash gerado pelo Bcrypt)
  createdAt: Date;        // Data e hora de criação da conta
  updatedAt: Date;        // Data e hora da última atualização
}

/**
 * Representa o Usuário "Seguro" (SafeUser), ou seja, sem a senha criptografada.
 * Este é o tipo retornado para o frontend nas respostas das APIs.
 * Usamos o utilitário `Omit<User, 'passwordHash'>` do TypeScript para garantir
 * que o campo passwordHash seja omitido.
 */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Representa a carga útil (Payload) armazenada dentro do Token JWT.
 * O JWT transporta essas informações codificadas em Base64 de forma pública,
 * porém com assinatura criptográfica para garantir que não foram alteradas.
 * 
 * IMPORTANTE: Nunca coloque dados sensíveis no payload (ex: senhas, cartões),
 * pois qualquer um pode ler o payload decodificando o Base64. Apenas o segredo
 * garante que ele não foi forjado.
 */
export interface JWTPayload {
  userId: number;         // ID do usuário para identificar quem está autenticado
  email: string;          // E-mail do usuário para conferência rápida
  iat?: number;           // "Issued At" (timestamp de quando o token foi gerado)
  exp?: number;           // "Expiration Time" (timestamp de quando o token expira)
}

/**
 * Estrutura padrão de resposta para requisições de autenticação bem-sucedidas.
 */
export interface AuthResponse {
  success: boolean;       // Indica se a operação foi bem-sucedida (true/false)
  message: string;        // Mensagem descritiva da ação realizada
  user?: SafeUser;        // Dados do usuário (sem a senha)
  token?: string;         // Token JWT gerado (caso seja retornado no corpo)
}

/**
 * Estrutura padrão de resposta de erro da API.
 */
export interface ApiErrorResponse {
  success: false;         // Sempre false para erros
  error: string;          // Mensagem de erro amigável
  details?: unknown;      // Detalhes extras (ex: erros de validação do Zod)
}
