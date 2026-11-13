import { clientIp } from '@/lib/voting/ip'
import { dailyVoterHash } from '@/lib/voting/hash'
import { correctionSchema } from './schema'

export const MAX_RAW_BODY = 10_000
export const MAX_PER_HOUR = 5

export type CorrectionsDeps = {
  now: () => Date
  env: { VOTE_HASH_SECRET: string }
  db: {
    countRecentBySubmitter(hash: string, sinceIso: string): Promise<number>
    insertCorrection(args: {
      body: string
      link: string | null
      email: string | null
      submitterHash: string
    }): Promise<void>
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

// Nada aqui registra IP, user-agent, e-mail, texto ou segredo em log.
export function createCorrectionsHandler(deps: CorrectionsDeps) {
  const { env, db } = deps

  async function POST(request: Request): Promise<Response> {
    const secret = env.VOTE_HASH_SECRET
    if (!secret) return json({ status: 'error' }, 500)

    // 1. Tamanho bruto e JSON
    let raw: unknown
    try {
      const text = await request.text()
      if (text.length > MAX_RAW_BODY) return json({ status: 'invalid' }, 400)
      raw = JSON.parse(text)
    } catch {
      return json({ status: 'invalid' }, 400)
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return json({ status: 'invalid' }, 400)
    }

    // 2. Campo-isca: robôs recebem a mesma resposta 200, sem gravar nem contar.
    const website = (raw as Record<string, unknown>).website
    if (typeof website === 'string' && website.trim() !== '') {
      return json({ status: 'received' }, 200)
    }

    // 3. Esquema
    const parsed = correctionSchema.safeParse(raw)
    if (!parsed.success) return json({ status: 'invalid' }, 400)
    const input = parsed.data

    try {
      // 4. Hash diário (domínio separado do hash de voto) e limite por hora
      const now = deps.now()
      const submitterHash = dailyVoterHash(
        clientIp(request.headers) ?? 'unknown',
        'correction|' + (request.headers.get('user-agent') ?? ''),
        now,
        secret,
      )
      const sinceIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      const recent = await db.countRecentBySubmitter(submitterHash, sinceIso)
      if (recent >= MAX_PER_HOUR) return json({ status: 'rate_limited' }, 429)

      // 5. Grava
      await db.insertCorrection({
        body: input.body,
        link: input.link ?? null,
        email: input.email ?? null,
        submitterHash,
      })
      return json({ status: 'received' }, 200)
    } catch {
      return json({ status: 'error' }, 500)
    }
  }

  return { POST }
}
