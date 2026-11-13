// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createCorrectionsHandler, type CorrectionsDeps } from '@/lib/corrections/handler'
import { dailyVoterHash } from '@/lib/voting/hash'
import * as route from './route'

const SECRET = 'segredo-de-teste'
const NOW = new Date('2026-11-25T15:00:00-03:00')
const UA = 'Mozilla/5.0 (teste)'
const IP = '203.0.113.7'

type Insert = Parameters<CorrectionsDeps['db']['insertCorrection']>[0]

function setup(overrides: { secret?: string; dbError?: boolean } = {}) {
  const stored: Array<Insert & { createdAt: Date }> = []
  const counts: Array<{ hash: string; sinceIso: string }> = []
  const handler = createCorrectionsHandler({
    now: () => NOW,
    env: { VOTE_HASH_SECRET: overrides.secret ?? SECRET },
    db: {
      async countRecentBySubmitter(hash, sinceIso) {
        counts.push({ hash, sinceIso })
        if (overrides.dbError) throw new Error('segredo interno do banco')
        return stored.filter((r) => r.submitterHash === hash && r.createdAt.toISOString() >= sinceIso).length
      },
      async insertCorrection(args) {
        if (overrides.dbError) throw new Error('segredo interno do banco')
        stored.push({ ...args, createdAt: NOW })
      },
    },
  })
  return { handler, stored, counts }
}

function req(body: unknown, headers: Record<string, string> = {}, raw?: string): Request {
  return new Request('https://exemplo.test/api/corrections', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': UA, 'x-forwarded-for': IP, ...headers },
    body: raw ?? JSON.stringify(body),
  })
}

const valid = { body: '  O ano de fundação está errado.  ' }

describe('POST /api/corrections', () => {
  it('campo-isca preenchido responde 200 sem gravar nem contar', async () => {
    const { handler, stored, counts } = setup()
    const res = await handler.POST(req({ ...valid, website: 'http://spam.test' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'received' })
    expect(stored).toHaveLength(0)
    expect(counts).toHaveLength(0)
  })

  it('campo-isca preenchido vale mesmo com os outros campos inválidos', async () => {
    const { handler, stored } = setup()
    const res = await handler.POST(req({ body: '', link: 'javascript:x', extra: 1, website: 'x' }))
    expect(res.status).toBe(200)
    expect(stored).toHaveLength(0)
  })

  it('campo-isca só com espaços é ignorado', async () => {
    const { handler, stored } = setup()
    const res = await handler.POST(req({ ...valid, website: '   ' }))
    expect(res.status).toBe(200)
    expect(stored).toHaveLength(1)
  })

  it('pedido válido grava uma vez com texto aparado e link/e-mail nulos', async () => {
    const { handler, stored } = setup()
    const res = await handler.POST(req(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'received' })
    expect(stored).toHaveLength(1)
    expect(stored[0].body).toBe('O ano de fundação está errado.')
    expect(stored[0].link).toBeNull()
    expect(stored[0].email).toBeNull()
  })

  it('link e e-mail vazios valem como ausentes; preenchidos são gravados', async () => {
    const a = setup()
    await a.handler.POST(req({ body: 'x', link: '', email: '' }))
    expect(a.stored[0].link).toBeNull()
    expect(a.stored[0].email).toBeNull()
    const b = setup()
    await b.handler.POST(req({ body: 'x', link: 'https://exemplo.test/fonte', email: 'a@exemplo.test' }))
    expect(b.stored[0].link).toBe('https://exemplo.test/fonte')
    expect(b.stored[0].email).toBe('a@exemplo.test')
  })

  it('5 pedidos passam e o 6º do mesmo hash na hora recebe 429', async () => {
    const { handler, stored } = setup()
    for (let i = 1; i <= 5; i++) {
      const res = await handler.POST(req(valid))
      expect(res.status).toBe(200)
    }
    const sixth = await handler.POST(req(valid))
    expect(sixth.status).toBe(429)
    expect(await sixth.json()).toEqual({ status: 'rate_limited' })
    expect(stored).toHaveLength(5)
  })

  it('outro IP não é limitado pelo primeiro', async () => {
    const { handler, stored } = setup()
    for (let i = 0; i < 5; i++) await handler.POST(req(valid))
    const res = await handler.POST(req(valid, { 'x-forwarded-for': '198.51.100.9' }))
    expect(res.status).toBe(200)
    expect(stored).toHaveLength(6)
  })

  it('o hash é estável para o mesmo ip+ua e diferente do hash de voto', async () => {
    const { handler, counts } = setup()
    await handler.POST(req(valid))
    await handler.POST(req(valid))
    expect(counts).toHaveLength(2)
    expect(counts[0].hash).toBe(counts[1].hash)
    expect(counts[0].hash).toBe(dailyVoterHash(IP, 'correction|' + UA, NOW, SECRET))
    expect(counts[0].hash === dailyVoterHash(IP, UA, NOW, SECRET)).toBe(false)
    expect(counts[0].sinceIso).toBe(new Date(NOW.getTime() - 3600_000).toISOString())
  })

  it('entradas inválidas respondem 400 sem gravar', async () => {
    const cases: Array<[string, unknown, string?]> = [
      ['corpo vazio', { body: '' }],
      ['só espaços', { body: '   \n ' }],
      ['2001 caracteres', { body: 'a'.repeat(2001) }],
      ['JSON inválido', null, '{nao é json'],
      ['requisição vazia', null, ''],
      ['JSON que não é objeto', null, '"texto"'],
      ['lista', null, '[]'],
      ['null', null, 'null'],
      ['campo extra', { body: 'x', extra: 1 }],
      ['link perigoso', { body: 'x', link: 'javascript:alert(1)' }],
      ['link sem esquema', { body: 'x', link: 'exemplo.test' }],
      ['link longo', { body: 'x', link: 'https://exemplo.test/' + 'a'.repeat(500) }],
      ['e-mail ruim', { body: 'x', email: 'nao-e-email' }],
      ['tipo errado', { body: 123 }],
      ['corpo bruto enorme', { body: 'x', website: '', pad: 'y'.repeat(10_001) }],
    ]
    for (const [name, body, rawText] of cases) {
      const { handler, stored, counts } = setup()
      const res = await handler.POST(req(body, {}, rawText))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ status: 'invalid' })
      expect(stored).toHaveLength(0)
      expect(counts).toHaveLength(0)
      void name
    }
  })

  it('2000 caracteres ainda é aceito', async () => {
    const { handler, stored } = setup()
    const res = await handler.POST(req({ body: 'a'.repeat(2000) }))
    expect(res.status).toBe(200)
    expect(stored).toHaveLength(1)
  })

  it('segredo ausente responde 500', async () => {
    const { handler, stored } = setup({ secret: '' })
    const res = await handler.POST(req(valid))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ status: 'error' })
    expect(stored).toHaveLength(0)
  })

  it('erro do banco responde 500 sem detalhes', async () => {
    const { handler } = setup({ dbError: true })
    const res = await handler.POST(req(valid))
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).toBe('{"status":"error"}')
  })

  it('sem x-forwarded-for ainda funciona (unknown)', async () => {
    const { handler, counts } = setup()
    const request = new Request('https://exemplo.test/api/corrections', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(valid),
    })
    const res = await handler.POST(request)
    expect(res.status).toBe(200)
    expect(counts[0].hash).toBe(dailyVoterHash('unknown', 'correction|', NOW, SECRET))
  })

  it('resposta não traz IP e não é cacheável', async () => {
    const { handler } = setup()
    const res = await handler.POST(req(valid))
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-type')).toBe('application/json')
    expect((await res.text()).includes(IP)).toBe(false)
  })
})

describe('route.ts', () => {
  it('exporta POST e importa sem variáveis de ambiente', () => {
    expect(typeof route.POST).toBe('function')
    expect(route.runtime).toBe('nodejs')
    expect(route.dynamic).toBe('force-dynamic')
  })
})
