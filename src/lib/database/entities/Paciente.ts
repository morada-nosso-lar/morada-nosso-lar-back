/**
 * ==============================================================================
 * ENTIDADE: PACIENTE (src/lib/database/entities/Paciente.ts)
 * ==============================================================================
 *
 * Representa a tabela `pacientes` no banco de dados PostgreSQL (Neon).
 *
 * CAMPOS:
 *   id                   → INTEGER auto-increment (PK)
 *   nome_completo        → VARCHAR(150) — nome completo do paciente
 *   data_nascimento      → DATE — data de nascimento (YYYY-MM-DD)
 *   observacoes_medicas  → TEXT nullable — observações médicas opcionais
 *   created_at           → TIMESTAMPTZ — preenchido automaticamente
 *   updated_at           → TIMESTAMPTZ — atualizado automaticamente
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pacientes')
export class Paciente {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150, name: 'nome_completo' })
  nomeCompleto!: string;

  @Column({ type: 'date', name: 'data_nascimento' })
  dataNascimento!: string;

  @Column({ type: 'text', name: 'observacoes_medicas', nullable: true })
  observacoesMedicas!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
