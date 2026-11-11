import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ResultsPanel } from '@/components/ResultsPanel'
import { getDailySeries, getResults, getSocioSplit, parseFilter } from '@/lib/results'
import { createAnonClient } from '@/lib/supabase/anon'
import { VOTING_CLOSES_AT, isVotingOpen } from '@/lib/voting/rules'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Resultados da simulação',
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

async function loadCandidates(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await createAnonClient().from('candidates').select('id,name')
  if (error) throw new Error(`Falha ao carregar candidatos: ${error.message}`)
  return (data ?? []) as { id: string; name: string }[]
}

export default async function ResultadosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const filter = parseFilter(params.filtro)
  const now = new Date()
  const closed = !isVotingOpen(now) && now.getTime() >= VOTING_CLOSES_AT.getTime()

  let panel: ReactNode
  try {
    const [summary, split, daily, candidates] = await Promise.all([
      getResults(filter),
      getSocioSplit(),
      getDailySeries(filter),
      loadCandidates(),
    ])
    panel = <ResultsPanel summary={summary} split={split} daily={daily} filter={filter} candidates={candidates} />
  } catch {
    panel = (
      <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
        Não foi possível carregar os resultados agora. Tente novamente em alguns instantes.
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Resultados da simulação</h1>
      {closed && (
        <p role="status" className="mt-4 border border-ink bg-gray-1 p-3 font-semibold">
          Votação encerrada. Resultados congelados.
        </p>
      )}
      <div className="mt-8">{panel}</div>
    </main>
  )
}
