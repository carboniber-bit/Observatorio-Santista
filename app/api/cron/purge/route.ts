import { createPurgeHandler } from '@/lib/corrections/purge-handler'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Vercel Cron chama com GET e envia "Authorization: Bearer $CRON_SECRET".
export async function GET(request: Request): Promise<Response> {
  const handler = createPurgeHandler({
    env: { CRON_SECRET: process.env.CRON_SECRET },
    async purge() {
      const { error } = await createServiceClient().rpc('purge_expired')
      if (error) throw new Error('purge_expired falhou')
    },
  })
  return handler.GET(request)
}
