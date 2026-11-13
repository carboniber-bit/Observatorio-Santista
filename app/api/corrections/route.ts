import { createCorrectionsHandler } from '@/lib/corrections/handler'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// As dependências reais são montadas só na chamada, para que importar este
// módulo não exija variáveis de ambiente.
function realHandler() {
  const supabase = createServiceClient()
  return createCorrectionsHandler({
    now: () => new Date(),
    env: { VOTE_HASH_SECRET: process.env.VOTE_HASH_SECRET ?? '' },
    db: {
      async countRecentBySubmitter(hash, sinceIso) {
        const { count, error } = await supabase
          .from('correction_requests')
          .select('id', { count: 'exact', head: true })
          .eq('submitter_hash', hash)
          .gte('created_at', sinceIso)
        if (error) throw new Error('contagem falhou')
        return count ?? 0
      },
      async insertCorrection({ body, link, email, submitterHash }) {
        const { error } = await supabase
          .from('correction_requests')
          .insert({ body, link, email, submitter_hash: submitterHash })
        if (error) throw new Error('insercao falhou')
      },
    },
  })
}

export async function POST(request: Request): Promise<Response> {
  let handler: ReturnType<typeof realHandler>
  try {
    handler = realHandler()
  } catch {
    return Response.json({ status: 'error' }, { status: 500 })
  }
  return handler.POST(request)
}
