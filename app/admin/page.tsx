import { requireAdmin } from '@/lib/admin/auth'
import { getResults, getSocioSplit } from '@/lib/results'
import { PageShell } from './_ui'

export const dynamic = 'force-dynamic'

async function count(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  table: 'proposals' | 'correction_requests',
): Promise<number | null> {
  const base = supabase.from(table).select('id', { count: 'exact', head: true })
  const { count: n, error } =
    table === 'proposals'
      ? await base.eq('status', 'em_revisao')
      : await base.is('handled_at', null)
  return error ? null : (n ?? 0)
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="border border-gray-2 p-4">
      <dt className="text-sm text-gray-4">{label}</dt>
      <dd className="font-serif text-3xl font-bold">{value ?? 'indisponível'}</dd>
    </div>
  )
}

// Indicadores somente leitura: funções de resultados existentes + contagens editoriais.
export default async function AdminHome() {
  const { supabase } = await requireAdmin()
  const [results, split, pending, corrections] = await Promise.all([
    getResults('all').catch(() => null),
    getSocioSplit().catch(() => null),
    count(supabase, 'proposals'),
    count(supabase, 'correction_requests'),
  ])
  return (
    <PageShell title="Indicadores">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Stat label="Votos válidos" value={results?.total ?? null} />
        <Stat label="Votos descartados (suspeitos)" value={results?.discarded ?? null} />
        <Stat label="Votos de sócios" value={split?.socio ?? null} />
        <Stat label="Votos de não sócios" value={split?.naoSocio ?? null} />
        <Stat label="Propostas em revisão" value={pending} />
        <Stat label="Pedidos de correção abertos" value={corrections} />
      </dl>
      <p className="mt-6 text-sm text-gray-4">
        Os votos são apenas lidos em agregado. O painel não oferece nenhuma forma de editar ou
        apagar votos.
      </p>
    </PageShell>
  )
}
