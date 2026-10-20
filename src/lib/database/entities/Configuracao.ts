/**
 * ==============================================================================
 * ENTIDADE: CONFIGURAÇÃO DO SISTEMA (src/lib/database/entities/Configuracao.ts)
 * ==============================================================================
 *
 * Representa a tabela `configuracoes` no banco de dados PostgreSQL (Neon).
 * Armazena as configurações gerais do sistema na forma de chave-valor.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Não consegui alterar nenhuma Configuração"
 *   → Implementar API de configurações com GET e PUT.
 *
 * ESTRUTURA CHAVE-VALOR:
 *   Cada configuração é um par (chave, valor) armazenado como texto.
 *   Exemplos:
 *     - chave: "estoque_minimo"        → valor: "2"
 *     - chave: "nome_instituicao"      → valor: "Morada Nosso Lar"
 *     - chave: "notificacoes_ativas"   → valor: "true"
 *
 * CAMPOS:
 *   id          → INTEGER auto-increment (PK)
 *   chave       → VARCHAR(100) UNIQUE — identificador da configuração
 *   valor       → TEXT — valor da configuração (sempre string, convertido na leitura)
 *   descricao   → TEXT nullable — descrição do que essa configuração faz
 *   updated_at  → TIMESTAMPTZ — última vez que o valor foi alterado
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('configuracoes')
export class Configuracao {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Chave única da configuração (ex: "estoque_minimo") */
  @Column({ type: 'varchar', length: 100, unique: true })
  chave!: string;

  /** Valor da configuração em formato texto */
  @Column({ type: 'text' })
  valor!: string;

  /** Descrição opcional explicando o propósito dessa configuração */
  @Column({ type: 'text', nullable: true })
  descricao!: string | null;

  /** Data de criação do registro */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  /** Data da última atualização do valor */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
