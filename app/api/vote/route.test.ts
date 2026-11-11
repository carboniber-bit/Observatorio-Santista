// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createVoteHandler, type VoteDeps } from '@/lib/voting/handler'
import { dailyVoterHash } from '@/lib/voting/hash'
import { newVoterToken } from '@/lib/voting/token'
import * as route from './route'

const SECRET = 'segredo-de-teste'
const CANDIDATE = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-11-25T15:00:00-03:00')
const UA = 'Mozilla/5.0 (teste)'

type CastArgs = Parameters<VoteDeps['db']['castVote']>[0]

function setup(overrides: { env?: Partial<VoteDeps['env']>; now?: Date; captcha?: boolean; recent?: number; castError?: unknown } = {}) {
  const usedTokens = new Set<string>()
  const casts: CastArgs[] = []
  const counted: Array<{ voterHash: string; sinceIso: string }> = []
  const handler = createVoteHandler({
    now: () => overrides.now ?? NOW,
    env: { VOTE_HASH_SECRET: SECRET, NODE_ENV: 'test', ...overrides.env },
    verifyTurnstile: async () => overrides.captcha ?? true,
    db: {
      async candidateExists(id) {
        return id === CANDIDATE
      },
      async countRecentHashVotes(voterHash, sinceIso) {
        counted.push({ voterHash, sinceIso })
        return overrides.recent ?? 0
      },
      async castVote(args) {
        // Modela o banco: espera um microtask (a corrida é real) e então
        // verifica e adiciona o token de forma síncrona e atômica.
        await Promise.resolve()
        if (overrides.castError) throw overrides.castError
        casts.push(args)
        if (usedTokens.has(args.tokenHash)) return false
        usedTokens.add(args.tokenHash)
        return true
      },
    },
  })
  return { handler, casts, counted, usedTokens }
}

function voteRequest(
  body: unknown,
  headers: Record<string, string> = {},
  raw?: string,
): Request {
  return new Request('https://exemplo.test/api/vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': UA, ...headers },
    body: raw ?? JSON.stringify(body),
  })
}

const valid = { candidateId: CANDIDATE, isSocio: true, turnstileToken: 'tok' }

function cookieFrom(res: Response): string {
  const setCookie = res.headers.get('set-cookie') ?? ''
  return setCookie.split(';')[0]
}

describe('POST /api/vote', () => {
  it('voto válido dá 200 e cookie os26_voter HttpOnly', async () => {
    const { handler, casts } = setup()
    const res = await handler.POST(voteRequest(valid, { 'x-forwarded-for': '203.0.113.9' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'recorded' })
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie.startsWith('os26_voter=')).toBe(true)
    expect(setCookie.includes('HttpOnly')).toBe(true)
    expect(setCookie.includes('SameSite=Lax')).toBe(true)
    expect(setCookie.includes('Path=/')).toBe(true)
    expect(setCookie.includes('Max-Age=7776000')).toBe(true)
    expect(setCookie.includes('Secure')).toBe(false)
    expect(casts.length).toBe(1)
    expect(casts[0].candidateId).toBe(CANDIDATE)
    expect(casts[0].isSocio).toBe(true)
    expect(casts[0].flag).toBe('valid')
  })

  it('cookie leva Secure em produção', async () => {
    const { handler } = setup({ env: { NODE_ENV: 'production' } })
    const res = await handler.POST(voteRequest(valid))
    expect((res.headers.get('set-cookie') ?? '').includes('Secure')).toBe(true)
  })

  it('segunda requisição com o mesmo cookie dá 409 e não emite novo cookie', async () => {
    const { handler } = setup()
    const first = await handler.POST(voteRequest(valid))
    const cookie = cookieFrom(first)
    const second = await handler.POST(voteRequest(valid, { cookie }))
    expect(second.status).toBe(409)
    expect(await second.json()).toEqual({ status: 'already_voted' })
    expect(second.headers.get('set-cookie')).toBe(null)
  })

  it('duas requisições simultâneas com o mesmo cookie: um 200 e um 409', async () => {
    const { handler, usedTokens } = setup()
    const { cookieValue } = newVoterToken(SECRET)
    const cookie = `os26_voter=${cookieValue}`
    const [a, b] = await Promise.all([
      handler.POST(voteRequest(valid, { cookie })),
      handler.POST(voteRequest(valid, { cookie })),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect(usedTokens.size).toBe(1)
  })

  it('cookie válido reaproveita o token (mesmo tokenHash que o do cookie)', async () => {
    const { handler, casts } = setup()
    const { cookieValue, tokenHash } = newVoterToken(SECRET)
    const res = await handler.POST(voteRequest(valid, { cookie: `outro=1; os26_voter=${cookieValue}` }))
    expect(res.status).toBe(200)
    expect(casts[0].tokenHash).toBe(tokenHash)
  })

  it('cookie adulterado é tratado como ausente e recebe token novo', async () => {
    const { handler, casts } = setup()
    const { cookieValue, tokenHash } = newVoterToken(SECRET)
    const [random, sig] = cookieValue.split('.')
    const flipped = (random[0] === 'A' ? 'B' : 'A') + random.slice(1)
    const res = await handler.POST(voteRequest(valid, { cookie: `os26_voter=${flipped}.${sig}` }))
    expect(res.status).toBe(200)
    expect(casts[0].tokenHash === tokenHash).toBe(false)
    expect(cookieFrom(res).includes(flipped)).toBe(false)
  })

  it('antes da abertura dá 410 com a mensagem certa e não grava', async () => {
    const { handler, casts } = setup({ env: { VOTING_OPENS_AT: '2026-11-26T00:00:00-03:00' } })
    const res = await handler.POST(voteRequest(valid))
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ status: 'closed', message: 'A votação ainda não foi aberta.' })
    expect(casts.length).toBe(0)
  })

  it('depois do encerramento dá 410 com a mensagem certa e não grava', async () => {
    const { handler, casts } = setup({ now: new Date('2026-12-12T00:00:00-03:00') })
    const res = await handler.POST(voteRequest(valid))
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({
      status: 'closed',
      message:
        'A votação foi encerrada em 11/12/2026 às 23:59 (horário de Brasília). Os resultados estão congelados.',
    })
    expect(casts.length).toBe(0)
  })

  it('Turnstile inválido dá 403 e não grava', async () => {
    const { handler, casts } = setup({ captcha: false })
    const res = await handler.POST(voteRequest(valid))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ status: 'captcha_failed' })
    expect(casts.length).toBe(0)
  })

  it('payloads inválidos dão 400 sem gravar', async () => {
    const { handler, casts } = setup()
    const cases: Array<[string, Request]> = [
      ['candidato inexistente', voteRequest({ ...valid, candidateId: '22222222-2222-4222-8222-222222222222' })],
      ['candidateId não-uuid', voteRequest({ ...valid, candidateId: 'abc' })],
      ['isSocio ausente', voteRequest({ candidateId: CANDIDATE, turnstileToken: 'tok' })],
      ['isSocio não booleano', voteRequest({ ...valid, isSocio: 'true' })],
      ['corpo vazio', voteRequest(undefined, {}, '')],
      ['JSON inválido', voteRequest(undefined, {}, '{nao e json')],
      ['campo extra', voteRequest({ ...valid, extra: 1 })],
      ['sem token do captcha', voteRequest({ ...valid, turnstileToken: '' })],
    ]
    for (const [, req] of cases) {
      const res = await handler.POST(req)
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ status: 'invalid' })
    }
    expect(casts.length).toBe(0)
  })

  it('candidateId null (Branco/Indeciso) é aceito', async () => {
    const { handler, casts } = setup()
    const res = await handler.POST(voteRequest({ ...valid, candidateId: null }))
    expect(res.status).toBe(200)
    expect(casts[0].candidateId).toBe(null)
  })

  it('sem x-forwarded-for funciona e o hash vem de "unknown"', async () => {
    const { handler, casts } = setup()
    const res = await handler.POST(voteRequest(valid))
    expect(res.status).toBe(200)
    expect(casts[0].voterHash).toBe(dailyVoterHash('unknown', UA, NOW, SECRET))
  })

  it('x-forwarded-for com lista usa o primeiro endereço', async () => {
    const { handler, casts } = setup()
    await handler.POST(voteRequest(valid, { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))
    expect(casts[0].voterHash).toBe(dailyVoterHash('203.0.113.9', UA, NOW, SECRET))
  })

  it('IPv6 funciona', async () => {
    const { handler, casts } = setup()
    const res = await handler.POST(voteRequest(valid, { 'x-forwarded-for': '2001:db8::1' }))
    expect(res.status).toBe(200)
    expect(casts[0].voterHash).toBe(dailyVoterHash('2001:db8::1', UA, NOW, SECRET))
  })

  it('conta votos recentes do hash na última hora', async () => {
    const { handler, counted } = setup()
    await handler.POST(voteRequest(valid, { 'x-forwarded-for': '203.0.113.9' }))
    expect(counted.length).toBe(1)
    expect(counted[0].voterHash).toBe(dailyVoterHash('203.0.113.9', UA, NOW, SECRET))
    expect(counted[0].sinceIso).toBe(new Date(NOW.getTime() - 3600_000).toISOString())
  })

  it('5 votos anteriores do hash: ainda valid; 6 anteriores: suspicious', async () => {
    const five = setup({ recent: 5 })
    await five.handler.POST(voteRequest(valid))
    expect(five.casts[0].flag).toBe('valid')
    const six = setup({ recent: 6 })
    await six.handler.POST(voteRequest(valid))
    expect(six.casts[0].flag).toBe('suspicious')
  })

  it('violação de chave estrangeira (23503) do castVote dá 400', async () => {
    const { handler } = setup({ castError: Object.assign(new Error('fk'), { code: '23503' }) })
    const res = await handler.POST(voteRequest(valid))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ status: 'invalid' })
  })

  it('outro erro do banco dá 500 sem vazar detalhes', async () => {
    const { handler } = setup({ castError: new Error('senha do banco: xyz') })
    const res = await handler.POST(voteRequest(valid))
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).toBe('{"status":"error"}')
  })

  it('segredo ausente dá 500 antes de qualquer coisa', async () => {
    const { handler, casts, counted } = setup({ env: { VOTE_HASH_SECRET: '' } })
    const res = await handler.POST(voteRequest(valid))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ status: 'error' })
    expect(casts.length).toBe(0)
    expect(counted.length).toBe(0)
  })

  it('corpo e cabeçalhos da resposta não contêm o IP', async () => {
    const { handler } = setup()
    const ip = '203.0.113.77'
    const res = await handler.POST(voteRequest(valid, { 'x-forwarded-for': ip }))
    const headers = JSON.stringify([...res.headers.entries()])
    expect(headers.includes(ip)).toBe(false)
    expect((await res.text()).includes(ip)).toBe(false)
  })
})

describe('GET /api/vote', () => {
  it('sem cookie dá 204 e emite o cookie', async () => {
    const { handler } = setup()
    const res = await handler.GET(new Request('https://exemplo.test/api/vote'))
    expect(res.status).toBe(204)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie.startsWith('os26_voter=')).toBe(true)
    expect(setCookie.includes('HttpOnly')).toBe(true)
  })

  it('com cookie válido dá 204 sem Set-Cookie', async () => {
    const { handler } = setup()
    const { cookieValue } = newVoterToken(SECRET)
    const res = await handler.GET(
      new Request('https://exemplo.test/api/vote', { headers: { cookie: `os26_voter=${cookieValue}` } }),
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie')).toBe(null)
  })

  it('com cookie adulterado emite um novo', async () => {
    const { handler } = setup()
    const res = await handler.GET(
      new Request('https://exemplo.test/api/vote', { headers: { cookie: 'os26_voter=abc.def' } }),
    )
    expect(res.status).toBe(204)
    expect((res.headers.get('set-cookie') ?? '').startsWith('os26_voter=')).toBe(true)
  })

  it('o cookie emitido no GET é aceito no POST e o token é o mesmo', async () => {
    const { handler, casts } = setup()
    const got = await handler.GET(new Request('https://exemplo.test/api/vote'))
    const res = await handler.POST(voteRequest(valid, { cookie: cookieFrom(got) }))
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie') !== null).toBe(true)
    expect(casts.length).toBe(1)
  })
})

describe('route.ts', () => {
  it('exporta GET e POST como funções', () => {
    expect(typeof route.GET).toBe('function')
    expect(typeof route.POST).toBe('function')
    expect(route.dynamic).toBe('force-dynamic')
    expect(route.runtime).toBe('nodejs')
  })
})
