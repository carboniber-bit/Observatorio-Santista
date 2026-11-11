import { createAnonClient } from '@/lib/supabase/anon'

export type ResultsFilter = 'all' | 'socio' | 'nao_socio'

export type ResultsSummary = {
  total: number
  byCandidate: { candidateId: string | null; votes: number; pct: number }[]
  discarded: number
  lastUpdated: string | null
}

type ResultRow = { candidate_id: string | null; votes: number | string }

// PostgREST pode devolver bigint como string.
function toNumber(value: number | string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// Função pura: monta o resumo a partir das linhas de get_results.
// A linha com candidate_id nulo é Branco/Indeciso e fica sempre por último.
export function summarize(
  rows: ResultRow[],
  discarded: number | string,
  lastUpdated: string | null,
): ResultsSummary {
  const counted = rows.map((r) => ({ candidateId: r.candidate_id, votes: toNumber(r.votes) }))
  const total = counted.reduce((sum, r) => sum + r.votes, 0)
  const byCandidate = counted
    .map((r) => ({
      ...r,
      pct: total === 0 ? 0 : Math.round((r.votes / total) * 1000) / 10,
    }))
    .sort((a, b) => {
      if (a.candidateId === null && b.candidateId !== null) return 1
      if (b.candidateId === null && a.candidateId !== null) return -1
      if (b.votes !== a.votes) return b.votes - a.votes
      return (a.candidateId ?? '') < (b.candidateId ?? '') ? -1 : (a.candidateId ?? '') > (b.candidateId ?? '') ? 1 : 0
    })
  return { total, byCandidate, discarded: toNumber(discarded), lastUpdated }
}

// ?filtro=todos|socio|nao_socio. Ausente ou desconhecido vira 'all'.
export function parseFilter(value: string | string[] | undefined): ResultsFilter {
  const v = Array.isArray(value) ? value[0] : value
  if (v === 'socio') return 'socio'
  if (v === 'nao_socio') return 'nao_socio'
  return 'all'
}

export async function getResults(filter: ResultsFilter): Promise<ResultsSummary> {
  const supabase = createAnonClient()
  const [results, discarded, last] = await Promise.all([
    supabase.rpc('get_results', { p_filter: filter }),
    supabase.rpc('get_discarded_count'),
    supabase.rpc('get_last_vote_at'),
  ])
  if (results.error) throw new Error(`Falha ao carregar resultados: ${results.error.message}`)
  if (discarded.error) throw new Error(`Falha ao carregar descartados: ${discarded.error.message}`)
  if (last.error) throw new Error(`Falha ao carregar última atualização: ${last.error.message}`)
  return summarize(
    (results.data ?? []) as ResultRow[],
    (discarded.data ?? 0) as number | string,
    (last.data ?? null) as string | null,
  )
}

export async function getSocioSplit(): Promise<{ socio: number; naoSocio: number }> {
  const supabase = createAnonClient()
  const { data, error } = await supabase.rpc('get_socio_split')
  if (error) throw new Error(`Falha ao carregar divisão sócio/não sócio: ${error.message}`)
  const row = ((data ?? []) as { socio: number | string; nao_socio: number | string }[])[0]
  return { socio: toNumber(row?.socio ?? 0), naoSocio: toNumber(row?.nao_socio ?? 0) }
}

export async function getDailySeries(
  filter: ResultsFilter,
): Promise<{ day: string; votes: number }[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase.rpc('get_daily_series', { p_filter: filter })
  if (error) throw new Error(`Falha ao carregar série diária: ${error.message}`)
  return ((data ?? []) as { day: string; votes: number | string }[]).map((r) => ({
    day: r.day,
    votes: toNumber(r.votes),
  }))
}
