-- ==============================================================================
-- CRIAÇÃO DA TABELA DE USUÁRIOS NO SUPABASE
-- ==============================================================================
-- Execute este SQL no Supabase Dashboard → SQL Editor → New query
-- ==============================================================================

-- 1. Cria a tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Cria índice no campo email para buscas rápidas no login
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 3. Habilita Row Level Security (RLS) — boa prática de segurança
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Política que permite operações CRUD usando a anon key
--    (Necessário pois RLS bloqueia tudo por padrão)
CREATE POLICY "Permitir acesso total via anon key para API backend"
  ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);
