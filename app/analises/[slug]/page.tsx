import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AnalysisView } from '@/components/AnalysisView'
import { BRAND_NAME } from '@/lib/brand'
import { getAnalysisBySlug, type Analysis } from '@/lib/editorial/content'

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

async function safeAnalysis(
  slug: string,
): Promise<{ ok: true; analysis: Analysis | null } | { ok: false }> {
  try {
    return { ok: true, analysis: await getAnalysisBySlug(slug) }
  } catch {
    return { ok: false }
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const result = await safeAnalysis(slug)
  if (!result.ok || !result.analysis) return { title: BRAND_NAME }
  return { title: `${result.analysis.title} | ${BRAND_NAME}` }
}

export default async function AnalisePage({ params }: { params: Params }) {
  const { slug } = await params
  const result = await safeAnalysis(slug)

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
          Não foi possível carregar a análise agora. Tente novamente em alguns instantes.
        </p>
      </main>
    )
  }
  if (!result.analysis) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AnalysisView analysis={result.analysis} />
    </main>
  )
}
