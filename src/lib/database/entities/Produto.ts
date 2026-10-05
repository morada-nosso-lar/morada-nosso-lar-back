/**
 * ==============================================================================
 * ENTIDADE: PRODUTO (src/lib/database/entities/Produto.ts)
 * ==============================================================================
 *
 * Representa a tabela `produtos` no banco de dados PostgreSQL (Neon).
 * Armazena os itens do estoque da instituição Morada Nosso Lar.
 *
 * CAMPOS:
 *   id             → INTEGER auto-increment (PK)
 *   nome           → VARCHAR(200) — nome do produto/suprimento
 *   categoria      → VARCHAR(100) — categoria do produto
 *   quantidade     → INTEGER — quantidade disponível em estoque
 *   descricao      → TEXT nullable — descrição adicional do produto
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

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  nome!: string;

  @Column({ type: 'varchar', length: 100 })
  categoria!: string;

  @Column({ type: 'int', default: 0 })
  quantidade!: number;

  @Column({ type: 'text', nullable: true })
  descricao!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
