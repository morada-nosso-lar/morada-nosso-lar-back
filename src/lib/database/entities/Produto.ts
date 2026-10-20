/**
 * ==============================================================================
 * ENTIDADE: PRODUTO (src/lib/database/entities/Produto.ts)
 * ==============================================================================
 *
 * Representa a tabela `produtos` no banco de dados PostgreSQL (Neon).
 * Armazena os itens do estoque da instituição Morada Nosso Lar.
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   - Adicionado campo `paciente_id` (nullable) para vincular produto a um paciente
 *   - A `categoria` agora é validada contra a lista pré-definida de categorias
 *
 * REGRAS DE NEGÓCIO:
 *   1. "Ao cadastrar novos pacientes eles já são iniciados como 3 itens no estoque"
 *      → O campo paciente_id vincula produtos ao paciente
 *   2. "O sistema deveria ter uma lista pré-definida de categorias"
 *      → Validação feita no Zod, a entidade aceita qualquer string válida
 *   3. "Não é possível editar um item cadastrado para um paciente"
 *      → Itens são imutáveis após criação. Para correções, usa-se o sistema de LOGs
 *
 * CAMPOS:
 *   id             → INTEGER auto-increment (PK)
 *   nome           → VARCHAR(200) — nome do produto/suprimento
 *   categoria      → VARCHAR(100) — categoria do produto (lista pré-definida)
 *   quantidade     → INTEGER — quantidade disponível em estoque
 *   descricao      → TEXT nullable — descrição adicional do produto
 *   paciente_id    → INTEGER nullable — FK para pacientes (null = estoque geral)
 *   created_at     → TIMESTAMPTZ — preenchido automaticamente
 *   updated_at     → TIMESTAMPTZ — atualizado automaticamente
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Paciente } from './Paciente';

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Nome do produto/suprimento */
  @Column({ type: 'varchar', length: 200 })
  nome!: string;

  /** Categoria do produto — validada contra lista pré-definida no Zod */
  @Column({ type: 'varchar', length: 100 })
  categoria!: string;

  /** Quantidade disponível em estoque */
  @Column({ type: 'int', default: 0 })
  quantidade!: number;

  /** Descrição adicional do produto (campo livre, opcional) */
  @Column({ type: 'text', nullable: true })
  descricao!: string | null;

  /**
   * ID do paciente vinculado a este produto.
   * - Se null: o produto pertence ao estoque geral da instituição
   * - Se preenchido: o produto é do estoque pessoal do paciente
   */
  @Column({ type: 'int', name: 'paciente_id', nullable: true })
  pacienteId!: number | null;

  /** Relacionamento com a entidade Paciente */
  @ManyToOne(() => Paciente, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paciente_id' })
  paciente!: Paciente | null;

  /** Timestamp de criação do registro */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  /** Timestamp da última atualização */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
