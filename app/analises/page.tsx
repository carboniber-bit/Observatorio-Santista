import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ProvenanceBadge } from '@/components/ProvenanceBadge'
import { BRAND_NAME } from '@/lib/brand'
import { getAnalyses } from '@/lib/editorial/content'
import { formatDatePtBr } from '@/lib/editorial/labels'
import { EditorialText } from '@/lib/editorial/text'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Análises | ${BRAND_NAME}`,
}

export default async function AnalisesPage() {
  let body: ReactNode
  try {
    const analyses = await getAnalyses()
    body =
      analyses.length === 0 ? (
        <p className="border border-gray-3 bg-gray-1 p-4">Nenhuma análise publicada ainda.</p>
      ) : (
        <ul className="space-y-6">
          {analyses.map((a) => (
            <li key={a.id} className="space-y-2 border-t border-gray-3 pt-4">
              <h2 className="font-serif text-xl font-bold">
                <Link href={`/analises/${encodeURIComponent(a.slug)}`} className="underline underline-offset-4">
                  <EditorialText value={a.title} />
                </Link>
              </h2>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-4">
                <ProvenanceBadge badge="editorial" />
                {a.published_at ? <span>{formatDatePtBr(a.published_at)}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )
  } catch {
    body = (
      <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
        Não foi possível carregar as análises agora. Tente novamente em alguns instantes.
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 font-serif text-3xl font-bold sm:text-4xl">Análises</h1>
      {body}
    </main>
  )
}
