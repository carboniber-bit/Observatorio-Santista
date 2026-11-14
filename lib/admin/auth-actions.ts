'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from './auth'

// Login por e-mail e senha (Supabase Auth). A segunda etapa (TOTP) fica em /admin/mfa.
// A mensagem de erro é sempre a mesma, para não revelar se o e-mail existe.
export async function formLogin(fd: FormData): Promise<void> {
  const email = String(fd.get('email') ?? '').trim()
  const password = String(fd.get('password') ?? '')
  if (!email || !password) redirect('/admin/login?erro=credenciais')
  const supabase = await createAdminClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect('/admin/login?erro=credenciais')
  redirect('/admin/mfa')
}

export async function formLogout(): Promise<void> {
  const supabase = await createAdminClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
