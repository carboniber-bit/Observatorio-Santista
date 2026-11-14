import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { decideAccess, isPublicAdminPath, redirectFor } from '@/lib/admin/guard'

// Primeira barreira do /admin: renova a sessão e redireciona. NÃO é a única: cada página
// e cada ação do painel chama requireAdmin() de novo (lib/admin/auth.ts).
export const config = { matcher: ['/admin/:path*'] }

function harden(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Sem configuração não há como autenticar: fecha o painel.
    const home = request.nextUrl.clone()
    home.pathname = '/'
    home.search = ''
    return harden(NextResponse.redirect(home))
  }

  const pending: { name: string; value: string; options?: object }[] = []
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const c of list) request.cookies.set(c.name, c.value)
        response = NextResponse.next({ request })
        for (const c of list) {
          response.cookies.set(c.name, c.value, c.options as never)
          pending.push(c)
        }
      },
    },
  })

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone()
    const [pathPart, query = ''] = path.split('?')
    target.pathname = pathPart
    target.search = query ? `?${query}` : ''
    const res = NextResponse.redirect(target)
    for (const c of pending) res.cookies.set(c.name, c.value, c.options as never)
    return harden(res)
  }

  const { pathname } = request.nextUrl
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user ?? null

  if (!user) {
    if (pathname === '/admin/login') return harden(response)
    return redirectTo(redirectFor('login'))
  }

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const aal = aalData?.currentLevel ?? null
  let isAdmin = false
  if (aal === 'aal2') {
    const { data, error } = await supabase.rpc('is_admin')
    isAdmin = !error && data === true
  }
  const decision = decideAccess({ user, aal, isAdmin })

  // /admin/login e /admin/mfa ficam acessíveis a quem ainda não completou o acesso.
  if (decision !== 'ok' && isPublicAdminPath(pathname)) return harden(response)
  if (decision === 'ok') return harden(response)
  return redirectTo(redirectFor(decision))
}
