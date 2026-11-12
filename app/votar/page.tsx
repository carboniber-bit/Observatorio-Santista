import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { VoteForm } from '@/components/VoteForm'
import { BRAND_NAME } from '@/lib/brand'
import { createAnonClient } from '@/lib/supabase/anon'
import { VOTING_CLOSES_AT, isVotingOpen } from '@/lib/voting/rules'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Votar | ${BRAND_NAME}`,
}

async function loadCandidates(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await createAnonClient().from('candidates').select('id, name')
  if (error) throw new Error('Falha ao carregar candidatos')
  const rows = (data ?? []) as { id: string; name: string }[]
  // Ordem alfabética fixa e neutra, igual para todos os visitantes.
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

function ResultsLink({ children }: { children: string }) {
  return (
    <Link
      href="/resultados"
      className="inline-flex min-h-11 items-center border border-ink bg-ink px-5 py-2 font-semibold text-paper underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  )
}

export default async function VotarPage() {
  const now = new Date()
  const open = isVotingOpen(now)
  const closed = now.getTime() >= VOTING_CLOSES_AT.getTime()

  let body: ReactNode
  if (!open) {
    body = (
      <div className="space-y-4">
        <p role="status" className="border border-ink bg-gray-1 p-4 font-semibold">
          {closed
            ? 'A votação foi encerrada em 11/12/2026 às 23:59 (horário de Brasília). Os resultados estão congelados.'
            : 'A votação ainda não foi aberta.'}
        </p>
        <ResultsLink>Ver resultados</ResultsLink>
      </div>
    )
  } else {
    try {
      const candidates = await loadCandidates()
      body = <VoteForm candidates={candidates} />
    } catch {
      body = (
        <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
          Não foi possível carregar a votação agora. Tente novamente em alguns instantes.
        </p>
      )
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Participe da simulação</h1>
      {body}
    </main>
  )
}
