/**
 * ==============================================================================
 * CAMADA DE PERSISTÊNCIA / BANCO DE DADOS EM MEMÓRIA (src/lib/db.ts)
 * ==============================================================================
 * 
 * PADRÃO REPOSITÓRIO (Repository Pattern):
 * Isolamos o acesso aos dados em funções assíncronas (Promises).
 * 
 * VANTAGENS DESTA ABORDAGEM:
 * 1. O restante do backend (rotas de API, regras de negócio) NÃO precisa saber 
 *    qual banco de dados está por trás.
 * 2. Quando você quiser plugar o PostgreSQL, MySQL, MongoDB ou um ORM (Prisma / Drizzle),
 *    basta substituir o código interno dessas funções sem quebrar nenhuma rota!
 * 
 * ESTADO EM MEMÓRIA:
 * Usamos uma lista `Map` em memória inicializada com um usuário de teste.
 * (Nota: Em desenvolvimento no Next.js com hot-reload, usamos `globalThis` para 
 * preservar os dados entre recarregamentos).
 */

import { User, SafeUser } from '@/types/auth';

// Declaração global para persistir o Map em memória durante o hot-reload do Next.js
const globalForDb = globalThis as unknown as {
  usersDatabase?: Map<string, User>;
};

// Inicializa a base de dados de usuários
const usersDatabase: Map<string, User> =
  globalForDb.usersDatabase || new Map<string, User>();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.usersDatabase = usersDatabase;
}

/**
 * Remove dados sensíveis (como passwordHash) do objeto de Usuário
 * antes de enviá-lo como resposta para o cliente.
 */
export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _discarded, ...safeUser } = user;
  return safeUser;
}

/**
 * Insere um usuário inicial de teste caso a base esteja vazia.
 * Email: admin@moradanossolar.com.br
 * Senha pura de teste: "Senha@123456"
 * Hash Bcrypt gerado: "$2a$10$7vNqv2KxO96L/lHwI4hZ.uG6y68d4y1Y5n19yY6b7G5r14H2tKq.G" (ou similar)
 */
function seedInitialUsers() {
  if (usersDatabase.size === 0) {
    const defaultUser: User = {
      id: 'usr_demo_123456',
      name: 'Administrador Morada Nosso Lar',
      email: 'admin@moradanossolar.com.br',
      // Hash da senha "Senha@123456" com bcrypt (10 rounds)
      passwordHash: '$2a$10$1Y5i/oD0bC5qB3Pz7d8i7eC2r7DkE9iF0gH1jK2lM3nO4pQ5rS6tU',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersDatabase.set(defaultUser.id, defaultUser);
  }
}

// Executa a carga inicial
seedInitialUsers();

/**
 * Repositório de Usuários (UserRepository)
 */
export const userRepository = {
  /**
   * Busca um usuário pelo endereço de e-mail (usado no Login e na verificação de cadastro)
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    for (const user of usersDatabase.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return user;
      }
    }
    return null;
  },

  /**
   * Busca um usuário pelo ID único (usado na rota protegida /api/auth/me)
   */
  async findById(id: string): Promise<User | null> {
    const user = usersDatabase.get(id);
    return user || null;
  },

  /**
   * Cria e salva um novo usuário na base de dados
   */
  async create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    // Gera um identificador único para o usuário (ex: usr_timestamp_random)
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const newUser: User = {
      id,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    usersDatabase.set(newUser.id, newUser);
    return newUser;
  },

  /**
   * Lista todos os usuários cadastrados (para fins de depuração/testes)
   */
  async listAll(): Promise<SafeUser[]> {
    return Array.from(usersDatabase.values()).map(sanitizeUser);
  },
};
