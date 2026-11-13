import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ComparatorPicker } from '@/components/ComparatorPicker'
import { ComparatorTable } from '@/components/ComparatorTable'
import { BRAND_NAME } from '@/lib/brand'
import { buildComparison } from '@/lib/editorial/comparison'
import { getCandidates } from '@/lib/editorial/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Comparador | ${BRAND_NAME}`,
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

function parseSlugs(raw: string | string[] | undefined, known: string[]): string[] {
  if (raw === undefined) return known
  const list = Array.isArray(raw) ? raw : [raw]
  const wanted = new Set(list)
  // Ordem alfabética dos candidatos (a de `known`), sem duplicatas e sem slugs desconhecidos.
  return known.filter((slug) => wanted.has(slug))
}

export default async function ComparadorPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  let body: ReactNode
  try {
    const candidates = await getCandidates()
    const slugs = parseSlugs(params.c, candidates.map((c) => c.slug))
    if (slugs.length < 2) {
      body = (
        <div className="space-y-6">
          <p role="alert" className="border border-ink bg-gray-1 p-4 font-semibold">
            Selecione pelo menos 2 candidatos para comparar.
          </p>
          <ComparatorPicker candidates={candidates} selected={slugs} />
        </div>
      )
    } else {
      const comparison = await buildComparison(slugs)
      body = (
        <div className="space-y-8">
          <ComparatorPicker candidates={candidates} selected={slugs} />
          <ComparatorTable comparison={comparison} />
        </div>
      )
    }
  } catch {
    body = (
      <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
        Não foi possível carregar o comparador agora. Tente novamente em alguns instantes.
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Comparador de propostas</h1>
      <p className="mb-8 mt-4 max-w-2xl">
        Somente propostas com fonte pública verificada são exibidas. Onde não há proposta
        verificável, a célula indica isso, sem suposições. Os candidatos aparecem em ordem
        alfabética.
      </p>
      {body}
    </main>
  )
}
