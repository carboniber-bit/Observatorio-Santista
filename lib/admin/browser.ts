import { createBrowserClient } from '@supabase/ssr'

// Cliente do navegador, usado só na tela de TOTP (/admin/mfa). Chave anon, sessão do usuário.
export function createAdminBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase não configurado')
  return createBrowserClient(url, key)
}
