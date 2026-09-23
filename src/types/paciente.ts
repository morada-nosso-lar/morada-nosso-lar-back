/**
 * ==============================================================================
 * TIPOS E INTERFACES DE PACIENTE (src/types/paciente.ts)
 * ==============================================================================
 *
 * Define a estrutura de dados do Paciente em diferentes contextos:
 * - Paciente: registro completo vindo do banco de dados (Neon/TypeORM)
 * - CreatePacienteInput: dados enviados pelo cliente ao cadastrar
 * - UpdatePacienteInput: dados enviados pelo cliente ao editar (parcial)
 *
 * NOTA: Os campos usam camelCase no TypeScript. O TypeORM cuida do mapeamento
 * para snake_case nas colunas do banco de dados automaticamente via entidades.
 */

/**
 * Representa a estrutura completa do Paciente retornada pelas APIs.
 * Corresponde à entidade `Paciente` do TypeORM (tabela `pacientes`).
 *
 * NOTA: O `id` agora é um número inteiro auto-incrementado.
 */
export interface Paciente {
  id: number;                        // Inteiro auto-increment
  nomeCompleto: string;              // Nome completo do paciente (obrigatório)
  dataNascimento: string;            // Data de nascimento no formato ISO (YYYY-MM-DD)
  observacoesMedicas: string | null; // Observações médicas (opcional)
  createdAt: Date;                   // Timestamp de criação
  updatedAt: Date;                   // Timestamp da última atualização
}

/**
 * Dados necessários para criar um novo paciente.
 */
export interface CreatePacienteInput {
  nomeCompleto: string;
  dataNascimento: string;
  observacoesMedicas?: string | null;
}

/**
 * Dados aceitos para atualizar um paciente existente.
 * Todos os campos são opcionais (atualização parcial).
 */
export interface UpdatePacienteInput {
  nomeCompleto?: string;
  dataNascimento?: string;
  observacoesMedicas?: string | null;
}

/**
 * Estrutura padrão de resposta de sucesso da API de pacientes.
 */
export interface PacienteApiResponse {
  success: boolean;
  message: string;
  data?: Paciente | Paciente[];
}
