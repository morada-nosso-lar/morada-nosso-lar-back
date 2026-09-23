/**
 * ==============================================================================
 * ENTIDADE: USER (src/lib/database/entities/User.ts)
 * ==============================================================================
 *
 * Representa a tabela `users` no banco de dados PostgreSQL (Neon).
 * O TypeORM usa decorators para mapear esta classe diretamente para a tabela.
 *
 * CAMPOS:
 *   id             → INTEGER auto-increment (PK)
 *   name           → VARCHAR(100) — nome do usuário
 *   email          → VARCHAR único — usado para login
 *   password_hash  → TEXT — hash bcrypt da senha
 *   created_at     → TIMESTAMPTZ — preenchido automaticamente
 *   updated_at     → TIMESTAMPTZ — atualizado automaticamente
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'text', name: 'password_hash' })
  passwordHash!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
