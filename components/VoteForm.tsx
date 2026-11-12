'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { ComponentType, FormEvent } from 'react'
import { TurnstileWidget } from '@/components/TurnstileWidget'

type Candidate = { id: string; name: string }

type CaptchaProps = {
  siteKey?: string
  onToken: (token: string | null) => void
  resetSignal?: number
}

type Props = {
  candidates: Candidate[]
  siteKey?: string
  CaptchaComponent?: ComponentType<CaptchaProps>
  fetchImpl?: typeof fetch
}

type Outcome = { kind: 'success' | 'info' | 'closed'; text: string; linkLabel: string }

const BLANK_VALUE = '__branco__'
const BLANK_LABEL = 'Branco/Indeciso'

const OPTION_CLASS =
  'flex min-h-11 cursor-pointer items-center gap-3 border border-gray-2 bg-paper px-3 py-2 hover:bg-gray-1 has-[:checked]:border-ink has-[:checked]:bg-gray-1'
const RADIO_CLASS = 'h-5 w-5 shrink-0 accent-ink'

const ERR_CAPTCHA = 'Não foi possível confirmar a verificação anti-robô. Tente novamente.'
const ERR_INVALID = 'Dados inválidos. Revise sua escolha e tente novamente.'
const ERR_GENERIC = 'Não foi possível registrar seu voto agora. Tente novamente em instantes.'

function RadioOption({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string
  value: string
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className={OPTION_CLASS}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className={RADIO_CLASS}
      />
      <span>{label}</span>
    </label>
  )
}

export function VoteForm({
  candidates,
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  CaptchaComponent = TurnstileWidget,
  fetchImpl,
}: Props) {
  const [isSocio, setIsSocio] = useState<boolean | null>(null)
  const [choice, setChoice] = useState<string | null>(null) // id, BLANK_VALUE ou null (não escolheu)
  const [token, setToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const postingRef = useRef(false)
  const fetchRef = useRef(fetchImpl)
  const resultRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    fetchRef.current = fetchImpl
  }, [fetchImpl])

  const doFetch = (input: string, init: RequestInit): Promise<Response> => {
    const impl = fetchRef.current ?? globalThis.fetch.bind(globalThis)
    return impl(input, init)
  }

  // Garante o cookie anônimo de eleitor (R22). Falhas são ignoradas.
  useEffect(() => {
    try {
      void Promise.resolve(doFetch('/api/vote', { credentials: 'same-origin' })).catch(() => {})
    } catch {
      // ignora
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Move o foco para o resultado final ou para o erro.
  useEffect(() => {
    if (outcome || error) resultRef.current?.focus()
  }, [outcome, error])

  const canSubmit = isSocio !== null && choice !== null && token !== null && !posting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (postingRef.current || isSocio === null || choice === null || token === null) return
    postingRef.current = true
    setPosting(true)
    setError(null)
    try {
      const res = await doFetch('/api/vote', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: choice === BLANK_VALUE ? null : choice,
          isSocio,
          turnstileToken: token,
        }),
      })
      if (res.status === 200) {
        setOutcome({
          kind: 'success',
          text: 'Voto registrado. Obrigado por participar!',
          linkLabel: 'Ver resultados',
        })
      } else if (res.status === 409) {
        setOutcome({
          kind: 'info',
          text: 'Seu voto já foi registrado neste navegador.',
          linkLabel: 'Ver resultados',
        })
      } else if (res.status === 410) {
        let message = ''
        try {
          const body = (await res.json()) as { message?: unknown }
          if (typeof body?.message === 'string') message = body.message
        } catch {
          // corpo ausente ou inválido
        }
        setOutcome({
          kind: 'closed',
          text: message || 'A votação está encerrada.',
          linkLabel: 'Ver resultados congelados',
        })
      } else if (res.status === 403) {
        setToken(null)
        setResetSignal((n) => n + 1)
        setError(ERR_CAPTCHA)
      } else if (res.status === 400) {
        setError(ERR_INVALID)
      } else {
        setError(ERR_GENERIC)
      }
    } catch {
      setError(ERR_GENERIC)
    } finally {
      postingRef.current = false
      setPosting(false)
    }
  }

  if (outcome) {
    return (
      <div className="space-y-4">
        <p
          ref={resultRef}
          role="status"
          tabIndex={-1}
          className="border border-ink bg-gray-1 p-4 font-semibold"
        >
          {outcome.text}
        </p>
        <Link
          href="/resultados"
          className="inline-flex min-h-11 items-center border border-ink bg-ink px-5 py-2 font-semibold text-paper underline-offset-4 hover:underline"
        >
          {outcome.linkLabel}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <div className="space-y-3 border border-gray-2 bg-gray-1 p-4 text-sm text-gray-4">
        <p>
          Seu voto é anônimo: não coletamos nome, CPF, e-mail, telefone nem endereço IP. Guardamos
          apenas um código aleatório no seu navegador (cookie essencial) para evitar voto duplicado
          e um identificador temporário e irreversível, apagado em 7 dias, para detectar abuso.
        </p>
        <p>
          Esta é uma votação espontânea, não é pesquisa científica e não substitui a eleição oficial
          do clube.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-serif text-lg font-bold">Você é sócio do Santos?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <RadioOption
            name="socio"
            value="sim"
            label="Sim"
            checked={isSocio === true}
            onChange={() => setIsSocio(true)}
          />
          <RadioOption
            name="socio"
            value="nao"
            label="Não"
            checked={isSocio === false}
            onChange={() => setIsSocio(false)}
          />
        </div>
      </fieldset>

      {isSocio !== null && (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-2 font-serif text-lg font-bold">Em quem você votaria?</legend>
            <div className="grid gap-2">
              {candidates.map((c) => (
                <RadioOption
                  key={c.id}
                  name="candidato"
                  value={c.id}
                  label={c.name}
                  checked={choice === c.id}
                  onChange={() => setChoice(c.id)}
                />
              ))}
              <RadioOption
                name="candidato"
                value={BLANK_VALUE}
                label={BLANK_LABEL}
                checked={choice === BLANK_VALUE}
                onChange={() => setChoice(BLANK_VALUE)}
              />
            </div>
          </fieldset>

          <CaptchaComponent siteKey={siteKey} onToken={setToken} resetSignal={resetSignal} />
        </>
      )}

      {error && (
        <p
          ref={resultRef}
          role="alert"
          tabIndex={-1}
          className="border-2 border-ink bg-gray-1 p-3 font-semibold"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="min-h-11 w-full border border-ink bg-ink px-6 py-2 font-semibold text-paper hover:bg-gray-4 disabled:cursor-not-allowed disabled:border-gray-2 disabled:bg-gray-1 disabled:text-gray-3 sm:w-auto"
      >
        {posting ? 'Enviando...' : 'Registrar voto'}
      </button>
    </form>
  )
}
