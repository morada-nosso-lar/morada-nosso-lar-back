/**
 * ==============================================================================
 * ENTIDADE: NOTIFICAÇÃO (src/lib/database/entities/Notificacao.ts)
 * ==============================================================================
 *
 * Representa a tabela `notificacoes` no banco de dados PostgreSQL (Neon).
 * Armazena notificações enviadas para a equipe de enfermagem.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "A notificação é para o paciente ou para a equipe de enfermagem?"
 *   → As notificações são destinadas à EQUIPE DE ENFERMAGEM.
 *   Elas informam sobre eventos importantes como:
 *     - Estoque baixo de um produto
 *     - Paciente desativado
 *     - Alterações críticas no sistema
 *
 * CAMPOS:
 *   id                → INTEGER auto-increment (PK)
 *   tipo              → VARCHAR(50) — tipo da notificação (ESTOQUE_BAIXO, PACIENTE_DESATIVADO, etc.)
 *   titulo            → VARCHAR(200) — título resumido da notificação
 *   mensagem          → TEXT — conteúdo detalhado da notificação
 *   destinatario_id   → INTEGER nullable — ID do usuário destinatário (null = todos)
 *   referencia_tipo   → VARCHAR(50) nullable — tipo da entidade referenciada (paciente, produto)
 *   referencia_id     → INTEGER nullable — ID da entidade referenciada
 *   lida              → BOOLEAN — se a notificação foi lida
 *   created_at        → TIMESTAMPTZ — data de criação
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('notificacoes')
export class Notificacao {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Tipo da notificação — identifica a categoria do evento.
   * Valores possíveis:
   *   - 'ESTOQUE_BAIXO'         → Produto atingiu quantidade mínima
   *   - 'PACIENTE_DESATIVADO'   → Paciente foi desativado no sistema
   *   - 'PACIENTE_ATIVADO'      → Paciente foi reativado
   *   - 'ESTOQUE_ZERADO'        → Estoque do paciente foi zerado
   *   - 'SISTEMA'               → Notificação geral do sistema
   */
  @Column({ type: 'varchar', length: 50 })
  tipo!: string;

  /** Título resumido da notificação (exibido na lista de notificações) */
  @Column({ type: 'varchar', length: 200 })
  titulo!: string;

  /** Mensagem completa com detalhes do evento */
  @Column({ type: 'text' })
  mensagem!: string;

  /**
   * ID do usuário destinatário da notificação.
   * Se null, a notificação é para TODOS os usuários (broadcast).
   */
  @Column({ type: 'int', name: 'destinatario_id', nullable: true })
  destinatarioId!: number | null;

  /** Tipo da entidade referenciada pela notificação (ex: 'paciente', 'produto') */
  @Column({ type: 'varchar', length: 50, name: 'referencia_tipo', nullable: true })
  referenciaTipo!: string | null;

  /** ID da entidade referenciada (ex: ID do paciente ou do produto) */
  @Column({ type: 'int', name: 'referencia_id', nullable: true })
  referenciaId!: number | null;

  /** Indica se a notificação já foi lida pelo destinatário */
  @Column({ type: 'boolean', default: false })
  lida!: boolean;

  /** Data e hora em que a notificação foi criada */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
