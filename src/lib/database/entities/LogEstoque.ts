/**
 * ==============================================================================
 * ENTIDADE: LOG DE ESTOQUE (src/lib/database/entities/LogEstoque.ts)
 * ==============================================================================
 *
 * Representa a tabela `logs_estoque` no banco de dados PostgreSQL (Neon).
 * Registra o histórico completo de todas as operações realizadas no estoque,
 * criando uma trilha de auditoria (audit trail) imutável.
 *
 * REGRA DE NEGÓCIO (Sprint 04):
 *   "Sempre que falamos em edição em sistemas de estoque também falamos
 *    em criação de LOGs para saber que editou."
 *
 * CADA LOG REGISTRA:
 *   - Quem fez a alteração (usuário autenticado)
 *   - O que foi alterado (produto)
 *   - Qual foi a ação (criação, atualização de quantidade, etc.)
 *   - Valores antes e depois da alteração
 *   - Quando a alteração foi feita
 *
 * CAMPOS:
 *   id               → INTEGER auto-increment (PK)
 *   produto_id       → INTEGER nullable — FK para a tabela produtos (SET NULL ao excluir)
 *   paciente_id      → INTEGER nullable — FK para a tabela pacientes (quando aplicável)
 *   usuario_id       → INTEGER — ID do usuário que realizou a ação
 *   usuario_nome     → VARCHAR(100) — nome do usuário no momento da ação (snapshot)
 *   acao             → VARCHAR(50) — tipo da ação realizada (enum/string)
 *   campo_alterado   → VARCHAR(100) nullable — qual campo foi alterado
 *   valor_anterior   → TEXT nullable — valor anterior à alteração
 *   valor_novo       → TEXT nullable — novo valor após a alteração
 *   descricao        → TEXT — descrição legível da ação
 *   created_at       → TIMESTAMPTZ — timestamp da ação
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

@Entity('logs_estoque')
export class LogEstoque {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * ID do produto afetado pela operação.
   * Fica nulo quando o produto é excluído (FK ON DELETE SET NULL).
   */
  @Column({ type: 'int', name: 'produto_id', nullable: true })
  produtoId!: number | null;

  /** ID do paciente relacionado (quando a operação envolve estoque de paciente) */
  @Column({ type: 'int', name: 'paciente_id', nullable: true })
  pacienteId!: number | null;

  /** ID do usuário (enfermeiro/admin) que realizou a ação */
  @Column({ type: 'int', name: 'usuario_id' })
  usuarioId!: number;

  /** Nome do usuário no momento da ação (snapshot para histórico) */
  @Column({ type: 'varchar', length: 100, name: 'usuario_nome' })
  usuarioNome!: string;

  /**
   * Tipo da ação realizada no estoque.
   * Valores possíveis:
   *   - 'CRIACAO'              → Produto cadastrado pela primeira vez
   *   - 'ATUALIZACAO_QTD'      → Quantidade do produto alterada
   *   - 'ATUALIZACAO_DADOS'    → Dados do produto alterados (nome, categoria, etc.)
   *   - 'EXCLUSAO'             → Produto removido do estoque
   *   - 'ESTOQUE_ZERADO'       → Estoque zerado por desativação de paciente
   *   - 'ITEM_INICIAL'         → Item padrão criado ao cadastrar novo paciente
   */
  @Column({ type: 'varchar', length: 50 })
  acao!: string;

  /** Nome do campo que foi alterado (ex: 'quantidade', 'nome', 'categoria') */
  @Column({ type: 'varchar', length: 100, name: 'campo_alterado', nullable: true })
  campoAlterado!: string | null;

  /** Valor anterior do campo antes da alteração */
  @Column({ type: 'text', name: 'valor_anterior', nullable: true })
  valorAnterior!: string | null;

  /** Novo valor do campo após a alteração */
  @Column({ type: 'text', name: 'valor_novo', nullable: true })
  valorNovo!: string | null;

  /** Descrição legível da ação (ex: "Quantidade alterada de 10 para 5") */
  @Column({ type: 'text' })
  descricao!: string;

  /** Relacionamento ManyToOne com a entidade Produto */
  @ManyToOne(() => Produto, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'produto_id' })
  produto!: Produto | null;

  /** Timestamp de quando a ação foi registrada (preenchido automaticamente) */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
