import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { decideAccess, redirectFor, type AccessDecision } from './guard'

// Cliente Supabase do servidor com a sessão do próprio usuário (cookies). Usa a chave
// anon: o que o admin pode fazer vem das políticas RLS e das RPCs, nunca da service role.
export async function createAdminClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias')
  }
  const store = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // Em Server Components a escrita de cookies falha; o middleware já renova a sessão.
        try {
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {
          /* ignorado */
        }
      },
    },
  })
}

export type AdminAccess = {
  decision: AccessDecision
  supabase: SupabaseClient
  user: User | null
}

// Reavalia o acesso a cada chamada: usuário validado no Auth, aal2 e is_admin() no banco.
export async function getAdminAccess(): Promise<AdminAccess> {
  const supabase = await createAdminClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user ?? null
  if (!user) return { decision: 'login', supabase, user: null }
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const aal = aalData?.currentLevel ?? null
  let isAdmin = false
  if (aal === 'aal2') {
    const { data, error } = await supabase.rpc('is_admin')
    isAdmin = !error && data === true
  }
  return { decision: decideAccess({ user, aal, isAdmin }), supabase, user }
}

// Chamada no início de TODA página e ação do painel (o middleware sozinho não basta).
export async function requireAdmin(): Promise<{ supabase: SupabaseClient; user: User }> {
  const access = await getAdminAccess()
  if (access.decision !== 'ok' || !access.user) {
    redirect(redirectFor(access.decision === 'ok' ? 'login' : access.decision))
  }
  return { supabase: access.supabase, user: access.user }
}
