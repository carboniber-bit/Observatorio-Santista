import { describe, it, expect } from 'vitest'
import { verifyTurnstile } from './turnstile'

type Call = { url: string; body: URLSearchParams }

function fakeFetch(respond: () => Response | Promise<Response>, calls: Call[] = []): typeof fetch {
  return (async (input: unknown, init?: { body?: unknown }) => {
    calls.push({ url: String(input), body: new URLSearchParams(String(init?.body)) })
    return respond()
  }) as unknown as typeof fetch
}

async function withSecret<T>(secret: string | undefined, fn: () => Promise<T>): Promise<T> {
  const original = process.env.TURNSTILE_SECRET_KEY
  try {
    if (secret === undefined) delete process.env.TURNSTILE_SECRET_KEY
    else process.env.TURNSTILE_SECRET_KEY = secret
    return await fn()
  } finally {
    if (original === undefined) delete process.env.TURNSTILE_SECRET_KEY
    else process.env.TURNSTILE_SECRET_KEY = original
  }
}

describe('verifyTurnstile', () => {
  it('devolve true quando success é true e envia secret, response e remoteip', async () => {
    const calls: Call[] = []
    const ok = await withSecret('segredo', () =>
      verifyTurnstile('tok', '203.0.113.9', fakeFetch(() => Response.json({ success: true }), calls)),
    )
    expect(ok).toBe(true)
    expect(calls.length).toBe(1)
    expect(calls[0].url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(calls[0].body.get('secret')).toBe('segredo')
    expect(calls[0].body.get('response')).toBe('tok')
    expect(calls[0].body.get('remoteip')).toBe('203.0.113.9')
  })

  it('não envia remoteip quando o IP é null', async () => {
    const calls: Call[] = []
    await withSecret('segredo', () =>
      verifyTurnstile('tok', null, fakeFetch(() => Response.json({ success: true }), calls)),
    )
    expect(calls[0].body.has('remoteip')).toBe(false)
  })

  it('devolve false quando success é false', async () => {
    const ok = await withSecret('segredo', () =>
      verifyTurnstile('tok', null, fakeFetch(() => Response.json({ success: false }))),
    )
    expect(ok).toBe(false)
  })

  it('devolve false quando success não é exatamente true', async () => {
    const ok = await withSecret('segredo', () =>
      verifyTurnstile('tok', null, fakeFetch(() => Response.json({ success: 'true' }))),
    )
    expect(ok).toBe(false)
  })

  it('devolve false em resposta não 2xx', async () => {
    const ok = await withSecret('segredo', () =>
      verifyTurnstile('tok', null, fakeFetch(() => Response.json({ success: true }, { status: 500 }))),
    )
    expect(ok).toBe(false)
  })

  it('devolve false em erro de rede', async () => {
    const ok = await withSecret('segredo', () =>
      verifyTurnstile(
        'tok',
        null,
        fakeFetch(() => {
          throw new Error('rede caiu')
        }),
      ),
    )
    expect(ok).toBe(false)
  })

  it('devolve false sem segredo e nem chama a rede', async () => {
    const calls: Call[] = []
    const ok = await withSecret(undefined, () =>
      verifyTurnstile('tok', null, fakeFetch(() => Response.json({ success: true }), calls)),
    )
    expect(ok).toBe(false)
    expect(calls.length).toBe(0)
  })
})
