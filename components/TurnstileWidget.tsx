'use client'

import { useEffect, useRef } from 'react'

type TurnstileOptions = {
  sitekey: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const SCRIPT_ID = 'cf-turnstile-script'

let scriptPromise: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem janela'))
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const fail = () => {
      scriptPromise = null
      reject(new Error('Falha ao carregar o Turnstile'))
    }
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', fail)
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => {
      script.remove()
      fail()
    })
    document.head.appendChild(script)
  })
  return scriptPromise
}

export type TurnstileWidgetProps = {
  siteKey?: string
  onToken: (token: string | null) => void
  resetSignal?: number
}

export function TurnstileWidget({ siteKey, onToken, resetSignal = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const lastResetRef = useRef(resetSignal)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    loadTurnstile()
      .then(() => {
        const container = containerRef.current
        if (cancelled || !container || !window.turnstile || widgetIdRef.current !== null) return
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => {
        if (!cancelled) onTokenRef.current(null)
      })
    return () => {
      cancelled = true
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // widget já removido
        }
      }
      widgetIdRef.current = null
    }
  }, [siteKey])

  useEffect(() => {
    if (resetSignal === lastResetRef.current) return
    lastResetRef.current = resetSignal
    if (widgetIdRef.current !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
      } catch {
        // ignora: o usuário pode recarregar a página
      }
    }
  }, [resetSignal])

  if (!siteKey) {
    return (
      <p className="border border-gray-3 bg-gray-1 p-3 text-sm text-gray-4">
        Verificação anti-robô indisponível (chave do Turnstile não configurada).
      </p>
    )
  }

  return <div ref={containerRef} data-testid="turnstile-container" className="min-h-[65px]" />
}
