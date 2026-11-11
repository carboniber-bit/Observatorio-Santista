import { createClient } from '@supabase/supabase-js'

// SOMENTE SERVIDOR: usa a chave service_role, que ignora RLS. Nunca importe este
// módulo em componente cliente nem exponha SUPABASE_SERVICE_ROLE_KEY ao navegador.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
