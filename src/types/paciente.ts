/**
 * ==============================================================================
 * TIPOS E INTERFACES DE PACIENTE (src/types/paciente.ts)
 * ==============================================================================
 *
 * Define a estrutura de dados do Paciente em diferentes contextos:
 * - Paciente: registro completo vindo do banco de dados (Neon/TypeORM)
 * - CreatePacienteInput: dados enviados pelo cliente ao cadastrar
 * - UpdatePacienteInput: dados enviados pelo cliente ao editar (parcial)
 * - DesativarPacienteInput: dados para desativar um paciente
 *
 * ALTERAÇÕES DA SPRINT 04:
 *   - Adicionado campo `cpf` (obrigatório, validado)
 *   - Adicionados campos de soft delete: `ativo`, `dataDesativacao`, `motivoDesativacao`
 *   - CPF removido do UpdatePacienteInput (imutável)
 *
 * NOTA: Os campos usam camelCase no TypeScript. O TypeORM cuida do mapeamento
 * para snake_case nas colunas do banco de dados automaticamente via entidades.
 */

/**
 * Representa a estrutura completa do Paciente retornada pelas APIs.
 * Corresponde à entidade `Paciente` do TypeORM (tabela `pacientes`).
 */
export interface Paciente {
  id: number;                           // Inteiro auto-increment
  cpf: string;                          // CPF sem formatação (11 dígitos)
  nomeCompleto: string;                 // Nome completo do paciente (obrigatório)
  dataNascimento: string;               // Data de nascimento no formato ISO (YYYY-MM-DD)
  observacoesMedicas: string | null;    // Observações médicas (opcional)
  telefonesFamiliar: string | null;     // Telefones do familiar (ex: celular e fixo)
  nomeFamiliar: string | null;          // Nome do familiar de contato (opcional)
  parentescoFamiliar: string | null;    // Parentesco do familiar (opcional)
  ativo: boolean;                       // Se o paciente está ativo no sistema
  dataDesativacao: Date | null;         // Data/hora da desativação (null se ativo)
  motivoDesativacao: string | null;     // Motivo da desativação (null se ativo)
  createdAt: Date;                      // Timestamp de criação
  updatedAt: Date;                      // Timestamp da última atualização
}

/**
 * Dados necessários para criar um novo paciente.
 * O CPF é obrigatório e validado pelo algoritmo oficial.
 */
export interface CreatePacienteInput {
  cpf: string;
  nomeCompleto: string;
  dataNascimento: string;
  observacoesMedicas?: string | null;
  telefonesFamiliar?: string | string[] | null;
  telefoneFamiliar?: string | string[] | null;
  nomeFamiliar?: string | null;
  parentescoFamiliar?: string | null;
}

/**
 * Dados aceitos para atualizar um paciente existente.
 * Todos os campos são opcionais (atualização parcial).
 * NOTA: CPF NÃO pode ser alterado (é um documento imutável).
 */
export interface UpdatePacienteInput {
  nomeCompleto?: string;
  dataNascimento?: string;
  observacoesMedicas?: string | null;
  telefonesFamiliar?: string | string[] | null;
  telefoneFamiliar?: string | string[] | null;
  nomeFamiliar?: string | null;
  parentescoFamiliar?: string | null;
}

/**
 * Dados necessários para desativar um paciente.
 */
export interface DesativarPacienteInput {
  acao: 'desativar';
  motivo: string;
}

/**
 * Dados para reativar um paciente.
 */
export interface ReativarPacienteInput {
  acao: 'reativar';
}

/**
 * Estrutura padrão de resposta de sucesso da API de pacientes.
 */
export interface PacienteApiResponse {
  success: boolean;
  message: string;
  data?: Paciente | Paciente[];
}
