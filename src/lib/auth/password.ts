/**
 * ==============================================================================
 * GERENCIAMENTO DE SENHAS COM BCRYPT (src/lib/auth/password.ts)
 * ==============================================================================
 * 
 * O QUE É O BCRYPT?
 * -----------------
 * O Bcrypt é uma função de hash criptográfico unidirecional projetada 
 * especificamente para armazenamento seguro de senhas.
 * 
 * POR QUE USAMOS HASH UNIDIRECIONAL?
 * 1. "Unidirecional" significa que uma vez que a senha é transformada em hash, 
 *    é matematicamente impossível reverter o hash para descobrir a senha original.
 * 2. Se o banco de dados for vazado, os invasores NÃO terão acesso às senhas dos usuários.
 * 
 * O QUE É O "SALT"?
 * Um "salt" (sal) é uma sequência aleatória de caracteres inserida junto com a senha 
 * antes de aplicar a função de hash. 
 * - Isso garante que duas senhas idênticas (ex: "123456") gerem hashes completamente 
 *   diferentes no banco de dados.
 * - Isso impede ataques usando "Rainbow Tables" (tabelas pré-computadas de hashes).
 * 
 * O QUE SÃO "SALT ROUNDS" (CUSTO / COMPLEXIDADE)?
 * O número de "rounds" define quantas iterações de processamento o algoritmo fará.
 * - 10 a 12 rounds é o padrão da indústria atualmente.
 * - Quanto maior o número, mais lento o processo (o que torna ataques de força bruta 
 *   inviáveis para hackers), mas sem travar o servidor da aplicação.
 */

import bcrypt from 'bcryptjs';

// Define o fator de custo (rounds) do algoritmo Bcrypt.
// 10 rounds significa 2^10 = 1024 iterações de hashing.
const SALT_ROUNDS = 10;

/**
 * Transforma uma senha em texto puro em um hash seguro com Salt.
 * 
 * @param password - A senha em texto puro digitada pelo usuário no cadastro
 * @returns Retorna uma Promise que resolve para a string do hash criptografado
 * 
 * Exemplo de Hash gerado:
 * "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
 *  └──┬──┘└──┬─┘└───┬───────────────────┘└───┬────────────────────────┘
 *  Versão   Rounds    Salt (22 caracteres)   Hash da senha (31 chars)
 */
export async function hashPassword(password: string): Promise<string> {
  // Gera o salt aleatório baseado nos rounds configurados
  const salt = await bcrypt.genSalt(SALT_ROUNDS);

  // Aplica o algoritmo de hash na senha combinada com o salt
  const hash = await bcrypt.hash(password, salt);

  return hash;
}

/**
 * Compara uma senha em texto puro fornecida na tentativa de login 
 * com o hash criptografado armazenado no banco de dados.
 * 
 * Como o Bcrypt funciona na verificação:
 * Ele extrai o "salt" contido dentro do `hashedPassword` salvo, aplica o mesmo 
 * algoritmo na `password` informada e compara se os resultados são idênticos.
 * 
 * @param password - A senha em texto puro digitada no formulário de login
 * @param hashedPassword - O hash armazenado previamente no banco de dados
 * @returns Retorna true se a senha for válida/correta, ou false se estiver errada
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  // Compara de forma segura (resistente a timing attacks)
  const isMatch = await bcrypt.compare(password, hashedPassword);
  return isMatch;
}
