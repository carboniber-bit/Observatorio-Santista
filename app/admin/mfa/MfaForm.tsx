'use client'

import { useCallback, useEffect, useState } from 'react'
import { createAdminBrowserClient } from '@/lib/admin/browser'
import { BUTTON, FIELD, LABEL } from '../_ui'

type Mode =
  | { kind: 'loading' }
  | { kind: 'challenge'; factorId: string }
  | { kind: 'enroll'; factorId: string; qr: string; secret: string }
  | { kind: 'error'; message: string }

// Única tela do painel que exige JavaScript: o TOTP é inscrito e verificado pelo
// Supabase Auth no navegador. Aqui o acesso ainda é aal1; o aal2 só vale depois do verify.
export function MfaForm() {
  const [mode, setMode] = useState<Mode>({ kind: 'loading' })
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const start = useCallback(async () => {
    try {
      const supabase = createAdminBrowserClient()
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      const verified = data.totp.find((f) => f.status === 'verified')
      if (verified) {
        setMode({ kind: 'challenge', factorId: verified.id })
        return
      }
      // Remove inscrições antigas não concluídas antes de criar outra.
      for (const f of data.all.filter((x) => x.factor_type === 'totp' && x.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const enrolled = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (enrolled.error) throw enrolled.error
      setMode({
        kind: 'enroll',
        factorId: enrolled.data.id,
        qr: enrolled.data.totp.qr_code,
        secret: enrolled.data.totp.secret,
      })
    } catch {
      setMode({ kind: 'error', message: 'Não foi possível iniciar a verificação. Entre novamente.' })
    }
  }, [])

  useEffect(() => {
    void start()
  }, [start])

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    if (mode.kind !== 'challenge' && mode.kind !== 'enroll') return
    setBusy(true)
    setMessage(null)
    try {
      const supabase = createAdminBrowserClient()
      const challenge = await supabase.auth.mfa.challenge({ factorId: mode.factorId })
      if (challenge.error) throw challenge.error
      const verified = await supabase.auth.mfa.verify({
        factorId: mode.factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      })
      if (verified.error) throw verified.error
      // Navegação completa para o servidor reler os cookies da sessão aal2.
      window.location.assign('/admin')
    } catch {
      setMessage('Código inválido ou expirado. Tente novamente.')
      setBusy(false)
    }
  }

  if (mode.kind === 'loading') return <p role="status">Carregando…</p>
  if (mode.kind === 'error') {
    return (
      <p role="alert" className="border-2 border-ink bg-gray-1 p-3 font-semibold">
        {mode.message}
      </p>
    )
  }

  return (
    <form onSubmit={verify} className="max-w-md space-y-6">
      {mode.kind === 'enroll' ? (
        <div className="space-y-3">
          <p>
            Escaneie o QR code com um aplicativo autenticador (Google Authenticator, 1Password,
            Authy ou similar) e informe o código de 6 dígitos.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mode.qr} alt="QR code para o aplicativo autenticador" width={200} height={200} />
          <p className="text-sm text-gray-4">
            Sem câmera? Digite esta chave no aplicativo:{' '}
            <code className="break-all font-mono">{mode.secret}</code>
          </p>
        </div>
      ) : (
        <p>Informe o código de 6 dígitos do seu aplicativo autenticador.</p>
      )}
      <div>
        <label htmlFor="mfa-code" className={LABEL}>
          Código de 6 dígitos
        </label>
        <input
          id="mfa-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={FIELD}
        />
      </div>
      {message ? (
        <p role="alert" className="border-2 border-ink bg-gray-1 p-3 font-semibold">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className={BUTTON}>
        Verificar
      </button>
    </form>
  )
}
