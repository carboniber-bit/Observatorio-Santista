import { timingSafeEqual } from 'node:crypto'

export type PurgeDeps = {
  env: { CRON_SECRET?: string }
  purge: () => Promise<void>
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function createPurgeHandler(deps: PurgeDeps) {
  async function GET(request: Request): Promise<Response> {
    const secret = deps.env.CRON_SECRET
    if (!secret) return json({ status: 'error' }, 500)

    const header = request.headers.get('authorization') ?? ''
    const prefix = 'Bearer '
    const provided = header.startsWith(prefix) ? header.slice(prefix.length) : null
    if (provided === null || !safeEqual(provided, secret)) {
      return json({ status: 'unauthorized' }, 401)
    }

    try {
      await deps.purge()
      return json({ status: 'ok' }, 200)
    } catch {
      return json({ status: 'error' }, 500)
    }
  }

  return { GET }
}
