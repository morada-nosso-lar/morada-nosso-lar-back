/**
 * ==============================================================================
 * CLIENTE SUPABASE (src/lib/supabase.ts)
 * ==============================================================================
 *
 * Cria uma instância única (singleton) do cliente Supabase para uso
 * nas API Routes (server-side). Utiliza as variáveis de ambiente
 * NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * IMPORTANTE:
 * - Essas variáveis são encontradas no Supabase Dashboard → Settings → API.
 * - A anon key é segura para uso público (Row Level Security controla o acesso).
 * - Para operações administrativas, use SUPABASE_SERVICE_ROLE_KEY (nunca exponha no client).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Configure-as no arquivo .env.local com os valores do seu projeto Supabase.'
  );
}

/**
 * Cliente Supabase singleton.
 * Reutilizado em todas as API Routes para evitar múltiplas conexões.
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
