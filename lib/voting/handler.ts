import { clientIp } from './ip'
import { dailyVoterHash } from './hash'
import { newVoterToken, verifyVoterToken } from './token'
import { classifyVote, isVotingOpen, VOTING_CLOSES_AT } from './rules'
import { voteSchema } from './schema'

export const VOTER_COOKIE = 'os26_voter'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90 // 90 dias

export type VoteDeps = {
  now: () => Date
  env: { VOTE_HASH_SECRET: string; VOTING_OPENS_AT?: string; NODE_ENV?: string }
  verifyTurnstile: (token: string, ip: string | null) => Promise<boolean>
  db: {
    candidateExists(id: string): Promise<boolean>
    countRecentHashVotes(voterHash: string, sinceIso: string): Promise<number>
    castVote(args: {
      tokenHash: string
      candidateId: string | null
      isSocio: boolean
      voterHash: string
      flag: 'valid' | 'suspicious'
    }): Promise<boolean>
  }
}

const MSG_NOT_OPEN = 'A votação ainda não foi aberta.'
const MSG_CLOSED =
  'A votação foi encerrada em 11/12/2026 às 23:59 (horário de Brasília). Os resultados estão congelados.'

function json(body: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  })
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return null
}

function setCookieValue(cookieValue: string, nodeEnv: string | undefined): string {
  const parts = [
    `${VOTER_COOKIE}=${cookieValue}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (nodeEnv === 'production') parts.push('Secure')
  return parts.join('; ')
}

function existingTokenHash(request: Request, secret: string): string | null {
  const cookie = readCookie(request, VOTER_COOKIE)
  if (cookie === null) return null
  const verified = verifyVoterToken(cookie, secret)
  return verified.ok && verified.tokenHash ? verified.tokenHash : null
}

// Nada aqui registra IP, user-agent, cookie, token ou segredo em log.
export function createVoteHandler(deps: VoteDeps) {
  const { env, db } = deps

  async function GET(request: Request): Promise<Response> {
    if (!env.VOTE_HASH_SECRET) return json({ status: 'error' }, 500)
    if (existingTokenHash(request, env.VOTE_HASH_SECRET) !== null) {
      return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } })
    }
    const { cookieValue } = newVoterToken(env.VOTE_HASH_SECRET)
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'no-store',
        'set-cookie': setCookieValue(cookieValue, env.NODE_ENV),
      },
    })
  }

  async function POST(request: Request): Promise<Response> {
    const secret = env.VOTE_HASH_SECRET
    if (!secret) return json({ status: 'error' }, 500)

    // 1. JSON
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return json({ status: 'invalid' }, 400)
    }

    // 2. Esquema
    const parsed = voteSchema.safeParse(raw)
    if (!parsed.success) return json({ status: 'invalid' }, 400)
    const input = parsed.data

    // 3. Período de votação
    const now = deps.now()
    if (!isVotingOpen(now, env.VOTING_OPENS_AT ?? '')) {
      const closed = now.getTime() >= VOTING_CLOSES_AT.getTime()
      return json({ status: 'closed', message: closed ? MSG_CLOSED : MSG_NOT_OPEN }, 410)
    }

    const ip = clientIp(request.headers)

    try {
      // 4. Turnstile (falha fechada)
      let human = false
      try {
        human = await deps.verifyTurnstile(input.turnstileToken, ip)
      } catch {
        human = false
      }
      if (!human) return json({ status: 'captcha_failed' }, 403)

      // 5. Cookie/token: cookie válido reaproveita o token; senão emite um novo.
      let tokenHash = existingTokenHash(request, secret)
      let cookieValue: string
      if (tokenHash !== null) {
        cookieValue = readCookie(request, VOTER_COOKIE) as string
      } else {
        const issued = newVoterToken(secret)
        tokenHash = issued.tokenHash
        cookieValue = issued.cookieValue
      }

      // 6. Candidato existe
      if (input.candidateId !== null && !(await db.candidateExists(input.candidateId))) {
        return json({ status: 'invalid' }, 400)
      }

      // 7. Hash diário e contagem da última hora
      const voterHash = dailyVoterHash(
        ip ?? 'unknown',
        request.headers.get('user-agent') ?? '',
        now,
        secret,
      )
      const sinceIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      const recent = await db.countRecentHashVotes(voterHash, sinceIso)
      // classifyVote recebe a contagem INCLUINDO o voto atual: 5 por hora valem, o 6º é suspeito.
      const flag = classifyVote(recent + 1)

      // 8. Grava
      let recorded: boolean
      try {
        recorded = await db.castVote({
          tokenHash,
          candidateId: input.candidateId,
          isSocio: input.isSocio,
          voterHash,
          flag,
        })
      } catch (err) {
        if ((err as { code?: unknown } | null)?.code === '23503') {
          return json({ status: 'invalid' }, 400)
        }
        throw err
      }

      if (!recorded) return json({ status: 'already_voted' }, 409)
      return json({ status: 'recorded' }, 200, {
        'set-cookie': setCookieValue(cookieValue, env.NODE_ENV),
      })
    } catch {
      return json({ status: 'error' }, 500)
    }
  }

  return { GET, POST }
}
