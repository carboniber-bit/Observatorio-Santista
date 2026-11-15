'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

type Props = { fetchImpl?: typeof fetch }

const MAX_BODY = 2000

const MSG_SUCCESS = 'Pedido de correção recebido. Obrigado!'
const MSG_INVALID = 'Revise o texto do pedido (obrigatório, até 2.000 caracteres).'
const MSG_RATE = 'Você enviou muitos pedidos em pouco tempo. Tente novamente mais tarde.'
const MSG_LINK = 'Informe um link válido (começando com http:// ou https://).'
const MSG_EMAIL = 'Informe um e-mail válido.'
const MSG_GENERIC = 'Não foi possível enviar seu pedido agora. Tente novamente em instantes.'

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const FIELD_CLASS =
  'block min-h-11 w-full border border-gray-3 bg-paper px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
const LABEL_CLASS = 'mb-1 block font-semibold'

export function CorrectionForm({ fetchImpl }: Props) {
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const postingRef = useRef(false)
  const fetchRef = useRef(fetchImpl)
  const resultRef = useRef<HTMLParagraphElement>(null)
  const linkRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchRef.current = fetchImpl
  }, [fetchImpl])

  // Move o foco para o resultado ou para o erro.
  useEffect(() => {
    // Erros de link/e-mail mantêm o foco no campo; os demais vão para a mensagem.
    if (error === MSG_LINK || error === MSG_EMAIL) return
    if (done || error) resultRef.current?.focus()
  }, [done, error])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (postingRef.current) return
    // Checagem no navegador: foca o campo com problema e diz qual é (o servidor valida de novo).
    if (link.trim() !== '' && !isHttpUrl(link.trim())) {
      setError(MSG_LINK)
      linkRef.current?.focus()
      return
    }
    if (email.trim() !== '' && !EMAIL_RE.test(email.trim())) {
      setError(MSG_EMAIL)
      emailRef.current?.focus()
      return
    }
    postingRef.current = true
    setPosting(true)
    setError(null)
    try {
      const payload: Record<string, string> = { body: body.trim(), website }
      if (link.trim() !== '') payload.link = link.trim()
      if (email.trim() !== '') payload.email = email.trim()
      const impl = fetchRef.current ?? globalThis.fetch.bind(globalThis)
      const res = await impl('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.status === 200) {
        setBody('')
        setLink('')
        setEmail('')
        setWebsite('')
        setDone(true)
      } else if (res.status === 400) {
        setError(MSG_INVALID)
      } else if (res.status === 429) {
        setError(MSG_RATE)
      } else {
        setError(MSG_GENERIC)
      }
    } catch {
      setError(MSG_GENERIC)
    } finally {
      postingRef.current = false
      setPosting(false)
    }
  }

  if (done) {
    return (
      <p
        ref={resultRef}
        role="status"
        tabIndex={-1}
        className="border border-ink bg-gray-1 p-4 font-semibold"
      >
        {MSG_SUCCESS}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <label htmlFor="correction-body" className={LABEL_CLASS}>
          O que precisa ser corrigido?
        </label>
        <textarea
          id="correction-body"
          name="body"
          required
          maxLength={MAX_BODY}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-describedby="correction-counter"
          className={FIELD_CLASS}
        />
        <p id="correction-counter" className="mt-1 text-sm text-gray-4">
          {body.length}/{MAX_BODY}
        </p>
      </div>

      <div>
        <label htmlFor="correction-link" className={LABEL_CLASS}>
          Link da fonte (opcional)
        </label>
        <input
          id="correction-link"
          name="link"
          ref={linkRef}
          type="url"
          aria-invalid={error === MSG_LINK ? true : undefined}
          maxLength={500}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label htmlFor="correction-email" className={LABEL_CLASS}>
          E-mail para retorno (opcional)
        </label>
        <input
          id="correction-email"
          name="email"
          ref={emailRef}
          type="email"
          aria-invalid={error === MSG_EMAIL ? true : undefined}
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={FIELD_CLASS}
        />
      </div>

      {/* Campo-isca: fora da tela e invisível a leitores de tela e ao teclado. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto' }}>
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

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
        disabled={posting}
        className="min-h-11 w-full border border-ink bg-ink px-6 py-2 font-semibold text-paper hover:bg-gray-4 disabled:cursor-not-allowed disabled:border-gray-2 disabled:bg-gray-1 disabled:text-gray-3 sm:w-auto"
      >
        Enviar pedido de correção
      </button>
    </form>
  )
}
