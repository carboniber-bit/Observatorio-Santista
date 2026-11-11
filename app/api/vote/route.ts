import { createVoteHandler } from '@/lib/voting/handler'
import { verifyTurnstile } from '@/lib/voting/turnstile'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// As dependências reais são montadas só na chamada, para que importar este
// módulo não exija variáveis de ambiente.
function realHandler() {
  const supabase = createServiceClient()
  return createVoteHandler({
    now: () => new Date(),
    env: {
      VOTE_HASH_SECRET: process.env.VOTE_HASH_SECRET ?? '',
      VOTING_OPENS_AT: process.env.VOTING_OPENS_AT,
      NODE_ENV: process.env.NODE_ENV,
    },
    verifyTurnstile: (token, ip) => verifyTurnstile(token, ip),
    db: {
      async candidateExists(id) {
        const { data, error } = await supabase
          .from('candidates')
          .select('id')
          .eq('id', id)
          .maybeSingle()
        if (error) throw error
        return data !== null
      },
      async countRecentHashVotes(voterHash, sinceIso) {
        const { count, error } = await supabase
          .from('vote_hashes')
          .select('vote_id', { count: 'exact', head: true })
          .eq('voter_hash', voterHash)
          .gte('created_at', sinceIso)
        if (error) throw error
        return count ?? 0
      },
      async castVote(args) {
        const { data, error } = await supabase.rpc('cast_vote', {
          p_token_hash: args.tokenHash,
          p_candidate_id: args.candidateId,
          p_is_socio: args.isSocio,
          p_voter_hash: args.voterHash,
          p_flag: args.flag,
        })
        if (error) throw Object.assign(new Error('cast_vote falhou'), { code: error.code })
        return data === true
      },
    },
  })
}

function errorResponse(): Response {
  return Response.json({ status: 'error' }, { status: 500 })
}

export async function GET(request: Request): Promise<Response> {
  let handler: ReturnType<typeof realHandler>
  try {
    handler = realHandler()
  } catch {
    return errorResponse()
  }
  return handler.GET(request)
}

export async function POST(request: Request): Promise<Response> {
  let handler: ReturnType<typeof realHandler>
  try {
    handler = realHandler()
  } catch {
    return errorResponse()
  }
  return handler.POST(request)
}
