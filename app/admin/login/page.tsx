import { formLogin } from '@/lib/admin/auth-actions'
import { BUTTON, Field, PageShell } from '../_ui'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams
  // Mensagens fixas: não revelam se o e-mail existe nem se está na allowlist.
  const message =
    erro === 'credenciais'
      ? 'E-mail ou senha incorretos.'
      : erro
        ? 'Não foi possível acessar o painel com esta conta.'
        : null
  return (
    <PageShell title="Entrar no painel">
      {message ? (
        <p role="alert" className="mb-6 border-2 border-ink bg-gray-1 p-3 font-semibold">
          {message}
        </p>
      ) : null}
      <form action={formLogin} className="max-w-md space-y-6">
        <Field id="login-email" label="E-mail" name="email" type="email" required />
        <Field id="login-password" label="Senha" name="password" type="password" required />
        <button type="submit" className={BUTTON}>
          Continuar
        </button>
      </form>
    </PageShell>
  )
}
