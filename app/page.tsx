import type { Metadata } from 'next'
import { HomeView, type HomeProposal } from '@/components/HomeView'
import { getPublishedNews } from '@/lib/editorial/content'
import { getCandidates, getPublishedProposals } from '@/lib/editorial/queries'
import { getResults } from '@/lib/results'
import { JsonLd } from '@/components/JsonLd'
import { BRAND_NAME } from '@/lib/brand'
import { pageMetadata, websiteJsonLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = pageMetadata({
  title: BRAND_NAME,
  description: 'Projeto independente sobre a eleição presidencial do Santos Futebol Clube em 2026.',
  path: '/',
})

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

export default async function HomePage() {
  const candidates = await safe(getCandidates)
  const [summary, newsAll, proposals] = await Promise.all([
    safe(() => getResults('all')),
    safe(getPublishedNews),
    candidates === null
      ? Promise.resolve(null)
      : safe(async (): Promise<HomeProposal[]> => {
          const lists = await Promise.all(
            candidates.map(async (c) =>
              (await getPublishedProposals(c.id)).map((proposal) => ({ candidateName: c.name, proposal })),
            ),
          )
          return lists
            .flat()
            .sort((a, b) => (a.proposal.created_at < b.proposal.created_at ? 1 : -1))
            .slice(0, 3)
        }),
  ])
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <HomeView
        summary={summary}
        candidates={candidates}
        news={newsAll === null ? null : newsAll.slice(0, 3)}
        proposals={proposals}
      />
    </>
  )
}
