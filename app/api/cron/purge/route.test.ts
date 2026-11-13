// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createPurgeHandler } from '@/lib/corrections/purge-handler'
import * as route from './route'

const SECRET = 'segredo-do-cron'

function setup(env: { CRON_SECRET?: string } = { CRON_SECRET: SECRET }, fail = false) {
  let calls = 0
  const handler = createPurgeHandler({
    env,
    async purge() {
      calls++
      if (fail) throw new Error('detalhe interno')
    },
  })
  return { handler, calls: () => calls }
}

function get(auth?: string): Request {
  return new Request('https://exemplo.test/api/cron/purge', {
    headers: auth === undefined ? {} : { authorization: auth },
  })
}

describe('GET /api/cron/purge', () => {
  it('sem cabeçalho responde 401', async () => {
    const { handler, calls } = setup()
    const res = await handler.GET(get())
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ status: 'unauthorized' })
    expect(calls()).toBe(0)
  })

  it('segredo errado responde 401', async () => {
    const { handler, calls } = setup()
    expect((await handler.GET(get('Bearer ' + 'x'.repeat(SECRET.length)))).status).toBe(401)
    expect(calls()).toBe(0)
  })

  it('segredo de tamanho diferente responde 401 sem lançar', async () => {
    const { handler, calls } = setup()
    for (const auth of ['Bearer x', 'Bearer ', 'Bearer ' + 'a'.repeat(500), SECRET, 'Basic ' + SECRET, 'Bearer ç']) {
      expect((await handler.GET(get(auth))).status).toBe(401)
    }
    expect(calls()).toBe(0)
  })

  it('segredo correto responde 200 e limpa uma vez', async () => {
    const { handler, calls } = setup()
    const res = await handler.GET(get(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
    expect(calls()).toBe(1)
  })

  it('CRON_SECRET ausente ou vazio responde 500 e não limpa', async () => {
    for (const env of [{}, { CRON_SECRET: '' }]) {
      const { handler, calls } = setup(env)
      expect((await handler.GET(get('Bearer '))).status).toBe(500)
      expect((await handler.GET(get('Bearer x'))).status).toBe(500)
      expect(calls()).toBe(0)
    }
  })

  it('falha na limpeza responde 500 sem detalhes', async () => {
    const { handler } = setup({ CRON_SECRET: SECRET }, true)
    const res = await handler.GET(get(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('{"status":"error"}')
  })
})

describe('route.ts', () => {
  it('exporta GET e importa sem variáveis de ambiente', () => {
    expect(typeof route.GET).toBe('function')
    expect(route.runtime).toBe('nodejs')
    expect(route.dynamic).toBe('force-dynamic')
  })
})
