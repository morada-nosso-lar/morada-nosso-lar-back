/**
 * ==============================================================================
 * CAMADA DE PERSISTÊNCIA — TYPEORM + NEON POSTGRES (src/lib/db.ts)
 * ==============================================================================
 * 
 * PADRÃO REPOSITÓRIO (Repository Pattern):
 * Isolamos o acesso aos dados em funções assíncronas (Promises).
 * 
 * VANTAGENS DESTA ABORDAGEM:
 * 1. O restante do backend (rotas de API, regras de negócio) NÃO precisa saber 
 *    qual banco de dados está por trás.
 * 2. As rotas continuam usando `userRepository.findByEmail(email)` da mesma forma,
 *    mas agora os dados são persistidos no Neon PostgreSQL via TypeORM.
 * 
 * MIGRAÇÃO:
 * Este arquivo foi migrado de Supabase SDK para TypeORM.
 * A interface pública (userRepository + sanitizeUser) permanece idêntica.
 */

import { User as UserType, SafeUser } from '@/types/auth';
import { getDataSource } from '@/lib/database/data-source';
import { User } from '@/lib/database/entities/User';

/**
 * Obtém o repositório TypeORM da entidade User.
 * Inicializa a conexão sob demanda (lazy) se ainda não estiver ativa.
 */
async function getUserRepo() {
  const ds = await getDataSource();
  return ds.getRepository(User);
}

/**
 * Converte uma entidade TypeORM User para a interface UserType (tipos da aplicação).
 * Como a entidade já usa camelCase, a conversão é direta.
 */
function entityToUser(entity: User): UserType {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    passwordHash: entity.passwordHash,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

/**
 * Remove dados sensíveis (como passwordHash) do objeto de Usuário
 * antes de enviá-lo como resposta para o cliente.
 */
export function sanitizeUser(user: UserType): SafeUser {
  const { passwordHash: _discarded, ...safeUser } = user;
  return safeUser;
}

// ---------------------------------------------------------------------------
// Repositório de Usuários (UserRepository) — agora com TypeORM
// ---------------------------------------------------------------------------

export const userRepository = {
  /**
   * Busca um usuário pelo endereço de e-mail (usado no Login e na verificação de cadastro).
   */
  async findByEmail(email: string): Promise<UserType | null> {
    const repo = await getUserRepo();
    const normalizedEmail = email.toLowerCase().trim();

    const user = await repo.findOneBy({ email: normalizedEmail });

    if (!user) return null;
    return entityToUser(user);
  },

  /**
   * Busca um usuário pelo ID único (usado na rota protegida /api/auth/me).
   * Agora recebe um `number` (inteiro auto-increment).
   */
  async findById(id: number): Promise<UserType | null> {
    const repo = await getUserRepo();

    const user = await repo.findOneBy({ id });

    if (!user) return null;
    return entityToUser(user);
  },

  /**
   * Cria e salva um novo usuário na base de dados.
   * O TypeORM gera o ID inteiro automaticamente via SERIAL/auto-increment.
   */
  async create(data: { name: string; email: string; passwordHash: string }): Promise<UserType> {
    const repo = await getUserRepo();

    const newUser = repo.create({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
    });

    const saved = await repo.save(newUser);
    return entityToUser(saved);
  },

  /**
   * Lista todos os usuários cadastrados (para fins de depuração/testes).
   */
  async listAll(): Promise<SafeUser[]> {
    const repo = await getUserRepo();

    const users = await repo.find({ order: { createdAt: 'DESC' } });
    return users.map(entityToUser).map(sanitizeUser);
  },
};
