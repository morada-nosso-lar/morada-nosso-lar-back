/**
 * ==============================================================================
 * ENTIDADE: PACIENTE (src/lib/database/entities/Paciente.ts)
 * ==============================================================================
 *
 * Representa a tabela `pacientes` no banco de dados PostgreSQL (Neon).
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   - Adicionado campo `cpf` com validação e unicidade
 *   - Adicionado campo `ativo` para soft delete (desativação em vez de exclusão)
 *   - Adicionado campo `data_desativacao` para registrar quando foi desativado
 *   - Adicionado campo `motivo_desativacao` para documentar o motivo
 *
 * REGRAS DE NEGÓCIO:
 *   1. "Validar CPF, o sistema está deixando cadastrar documentos inválidos"
 *      → CPF agora é obrigatório e validado pelo algoritmo oficial
 *   2. "O sistema não deve permitir que um paciente seja excluído"
 *      → Substituído DELETE por soft delete (campo `ativo`)
 *   3. "O sistema deve desativar pacientes, zerando seus estoques"
 *      → Campo `ativo` controla se o paciente pode receber movimentações
 *
 * CAMPOS:
 *   id                     → INTEGER auto-increment (PK)
 *   cpf                    → VARCHAR(11) UNIQUE — CPF sem formatação (apenas dígitos)
 *   nome_completo          → VARCHAR(150) — nome completo do paciente
 *   data_nascimento        → DATE — data de nascimento (YYYY-MM-DD)
 *   observacoes_medicas    → TEXT nullable — observações médicas opcionais
 *   ativo                  → BOOLEAN — se o paciente está ativo no sistema (default: true)
 *   data_desativacao       → TIMESTAMPTZ nullable — quando o paciente foi desativado
 *   motivo_desativacao     → TEXT nullable — motivo da desativação
 *   created_at             → TIMESTAMPTZ — preenchido automaticamente
 *   updated_at             → TIMESTAMPTZ — atualizado automaticamente
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

  /**
   * CPF do paciente — armazenado sem formatação (apenas 11 dígitos numéricos).
   * A validação do algoritmo de dígitos verificadores é feita na camada de validação (Zod).
   * Possui constraint UNIQUE para evitar cadastros duplicados.
   */
  @Column({ type: 'varchar', length: 11, unique: true })
  cpf!: string;

  /** Nome completo do paciente */
  @Column({ type: 'varchar', length: 150, name: 'nome_completo' })
  nomeCompleto!: string;

  /** Data de nascimento no formato ISO (YYYY-MM-DD) */
  @Column({ type: 'date', name: 'data_nascimento' })
  dataNascimento!: string;

  /** Observações médicas do paciente (campo livre, opcional) */
  @Column({ type: 'text', name: 'observacoes_medicas', nullable: true })
  observacoesMedicas!: string | null;

  /**
   * Indica se o paciente está ativo no sistema.
   * Pacientes desativados:
   *   - Não podem receber novas movimentações de estoque
   *   - Têm seus estoques zerados automaticamente
   *   - Continuam no banco para consulta de histórico
   */
  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  /** Data e hora em que o paciente foi desativado (null se ativo) */
  @Column({ type: 'timestamptz', name: 'data_desativacao', nullable: true })
  dataDesativacao!: Date | null;

  /** Motivo da desativação documentado pelo operador */
  @Column({ type: 'text', name: 'motivo_desativacao', nullable: true })
  motivoDesativacao!: string | null;

  /** Timestamp de criação do registro */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  /** Timestamp da última atualização do registro */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
