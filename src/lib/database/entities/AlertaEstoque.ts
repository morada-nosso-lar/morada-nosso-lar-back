/**
 * ==============================================================================
 * ENTIDADE: ALERTA DE ESTOQUE (src/lib/database/entities/AlertaEstoque.ts)
 * ==============================================================================
 *
 * Representa a tabela `alertas_estoque` no banco de dados PostgreSQL (Neon).
 * Registra o histórico de alertas gerados automaticamente quando a quantidade
 * de um produto atinge o limite mínimo (≤ 2 unidades).
 *
 * CAMPOS:
 *   id             → INTEGER auto-increment (PK)
 *   produto_id     → INTEGER — FK para a tabela produtos
 *   produto_nome   → VARCHAR(200) — nome do produto no momento do alerta (snapshot)
 *   quantidade     → INTEGER — quantidade no momento do alerta
 *   mensagem       → TEXT — mensagem descritiva do alerta
 *   lido           → BOOLEAN — indica se o alerta foi visualizado/resolvido
 *   created_at     → TIMESTAMPTZ — data/hora em que o alerta foi gerado
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Produto } from './Produto';

@Entity('alertas_estoque')
export class AlertaEstoque {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'produto_id' })
  produtoId!: number;

  @Column({ type: 'varchar', length: 200, name: 'produto_nome' })
  produtoNome!: string;

  @Column({ type: 'int' })
  quantidade!: number;

  @Column({ type: 'text' })
  mensagem!: string;

  @Column({ type: 'boolean', default: false })
  lido!: boolean;

  @ManyToOne(() => Produto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'produto_id' })
  produto!: Produto;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
