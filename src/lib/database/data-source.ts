/**
 * ==============================================================================
 * DATA SOURCE — TYPEORM + NEON WEBSOCKET (src/lib/database/data-source.ts)
 * ==============================================================================
 *
 * Configura a conexão do TypeORM com Neon PostgreSQL usando WebSocket
 * em vez de TCP direto (porta 5432), evitando bloqueios de firewall.
 *
 * O driver `@neondatabase/serverless` fornece um Pool compatível com `pg`
 * que roteia a conexão via WebSocket (porta 443).
 *
 * VARIÁVEL DE AMBIENTE NECESSÁRIA:
 *   DATABASE_URL → connection string do Neon (PostgreSQL)
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { User } from './entities/User';
import { Paciente } from './entities/Paciente';

// Configura o Neon para usar WebSocket nativo do Node.js
neonConfig.webSocketConstructor = ws;

/**
 * Singleton para preservar a conexão durante hot-reload do Next.js.
 */
const globalForDb = globalThis as unknown as {
  _typeormDataSource?: DataSource;
};

/**
 * Cria o DataSource do TypeORM usando o Pool do Neon Serverless
 * que conecta via WebSocket (porta 443) em vez de TCP (porta 5432).
 */
function createDataSource(): DataSource {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não está definida no .env.local');
  }

  return new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: true,
    driver: require('@neondatabase/serverless'),
    entities: [User, Paciente],
    synchronize: true,
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
    connectTimeoutMS: 15000,
  });
}

/**
 * Retorna uma instância inicializada do DataSource.
 * Reutiliza conexão existente via globalThis para hot-reload.
 */
export async function getDataSource(): Promise<DataSource> {
  if (globalForDb._typeormDataSource?.isInitialized) {
    return globalForDb._typeormDataSource;
  }

  const ds = createDataSource();
  await ds.initialize();
  console.log('[TypeORM] Conexão com Neon estabelecida via WebSocket.');

  if (process.env.NODE_ENV !== 'production') {
    globalForDb._typeormDataSource = ds;
  }

  return ds;
}
