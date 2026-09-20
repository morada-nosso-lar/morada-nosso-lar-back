/**
 * ==============================================================================
 * TIPOS E INTERFACES DE PACIENTE (src/types/paciente.ts)
 * ==============================================================================
 *
 * Define a estrutura de dados do Paciente em diferentes contextos:
 * - Paciente: registro completo vindo do banco de dados (Supabase)
 * - CreatePacienteInput: dados enviados pelo cliente ao cadastrar
 * - UpdatePacienteInput: dados enviados pelo cliente ao editar (parcial)
 */

/**
 * Representa a estrutura completa do Paciente no banco de dados Supabase.
 * Corresponde à tabela `pacientes`.
 */
export interface Paciente {
  id: string;                    // UUID gerado automaticamente pelo Supabase
  nome_completo: string;         // Nome completo do paciente (obrigatório)
  data_nascimento: string;       // Data de nascimento no formato ISO (YYYY-MM-DD)
  observacoes_medicas: string | null; // Observações médicas (opcional)
  created_at: string;            // Timestamp de criação (ISO 8601)
  updated_at: string;            // Timestamp da última atualização (ISO 8601)
}

/**
 * Dados necessários para criar um novo paciente.
 */
export interface CreatePacienteInput {
  nome_completo: string;
  data_nascimento: string;
  observacoes_medicas?: string | null;
}

/**
 * Dados aceitos para atualizar um paciente existente.
 * Todos os campos são opcionais (atualização parcial).
 */
export interface UpdatePacienteInput {
  nome_completo?: string;
  data_nascimento?: string;
  observacoes_medicas?: string | null;
}

/**
 * Estrutura padrão de resposta de sucesso da API de pacientes.
 */
export interface PacienteApiResponse {
  success: boolean;
  message: string;
  data?: Paciente | Paciente[];
}
