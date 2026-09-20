-- ==============================================================================
-- SCRIPT SQL — CRIAÇÃO DA TABELA DE PACIENTES (Supabase)
-- ==============================================================================
--
-- INSTRUÇÕES:
--   1. Acesse o Supabase Dashboard do seu projeto
--   2. Vá em "SQL Editor" (ícone no menu lateral)
--   3. Clique em "New Query"
--   4. Cole todo o conteúdo deste arquivo
--   5. Clique em "Run" (ou Ctrl+Enter)
--
-- NOTA: Este script é idempotente (pode ser executado mais de uma vez sem erro).
-- ==============================================================================

-- 1. Criação da tabela `pacientes`
CREATE TABLE IF NOT EXISTS pacientes (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo       TEXT NOT NULL,
  data_nascimento     DATE NOT NULL,
  observacoes_medicas TEXT,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Comentários descritivos para documentação no banco
COMMENT ON TABLE  pacientes                      IS 'Cadastro de pacientes da Morada Nosso Lar';
COMMENT ON COLUMN pacientes.id                   IS 'Identificador único UUID gerado automaticamente';
COMMENT ON COLUMN pacientes.nome_completo        IS 'Nome completo do paciente';
COMMENT ON COLUMN pacientes.data_nascimento      IS 'Data de nascimento do paciente';
COMMENT ON COLUMN pacientes.observacoes_medicas  IS 'Observações médicas relevantes (opcional)';
COMMENT ON COLUMN pacientes.created_at           IS 'Data e hora de criação do registro';
COMMENT ON COLUMN pacientes.updated_at           IS 'Data e hora da última atualização do registro';

-- 3. Índice para buscas por nome (otimização)
CREATE INDEX IF NOT EXISTS idx_pacientes_nome
  ON pacientes (nome_completo);

-- 4. Habilitar Row Level Security (RLS)
--    O RLS garante que apenas requisições autorizadas possam acessar os dados.
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;

-- 5. Policy permissiva para a anon key (em desenvolvimento)
--    ATENÇÃO: Em produção, refine esta policy para restringir por usuário autenticado.
CREATE POLICY "Permitir todas as operações via anon key"
  ON pacientes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Trigger para atualizar automaticamente o campo `updated_at`
--    Sempre que um registro for modificado, o `updated_at` será atualizado.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger existente para evitar duplicação
DROP TRIGGER IF EXISTS trigger_update_pacientes_updated_at ON pacientes;

CREATE TRIGGER trigger_update_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- FIM DO SCRIPT
-- ==============================================================================
