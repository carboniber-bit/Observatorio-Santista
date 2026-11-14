// Decisão pura de acesso ao painel. Não revela o motivo da negação: quem não está
// na allowlist recebe apenas 'denied', igual a qualquer outro bloqueio.

export type AccessDecision = 'login' | 'mfa' | 'denied' | 'ok'

export type AccessInput = {
  // Usuário autenticado (validado pelo Supabase Auth) ou null.
  user: { id: string; email?: string | null } | null
  // Nível de garantia da sessão: aal1 (só senha) ou aal2 (senha + TOTP).
  aal: string | null | undefined
  // Resultado de rpc('is_admin'): aal2 no JWT e e-mail na admin_allowlist.
  isAdmin: boolean
}

export function decideAccess({ user, aal, isAdmin }: AccessInput): AccessDecision {
  if (!user) return 'login'
  if (aal !== 'aal2') return 'mfa'
  if (isAdmin !== true) return 'denied'
  return 'ok'
}

// Destino de redirecionamento para cada decisão que não seja 'ok'.
export function redirectFor(decision: Exclude<AccessDecision, 'ok'>): string {
  switch (decision) {
    case 'login':
      return '/admin/login'
    case 'mfa':
      return '/admin/mfa'
    case 'denied':
      return '/admin/login?erro=acesso'
  }
}

// Rotas sob /admin acessíveis sem sessão completa.
export function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname === '/admin/mfa'
}
