import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { JsonLd } from '@/components/JsonLd'
import { CandidateProfile } from '@/components/CandidateProfile'
import { BRAND_NAME } from '@/lib/brand'
import {
  getCandidateBySlug,
  getPublishedProposals,
  getThemes,
  type Candidate,
  type ProposalWithSources,
  type Theme,
} from '@/lib/editorial/queries'
import { candidatePageJsonLd, pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

// cache(): generateMetadata e a página compartilham uma única consulta por requisição.
const safeCandidate = cache(
  async (slug: string): Promise<{ ok: true; candidate: Candidate | null } | { ok: false }> => {
    try {
      return { ok: true, candidate: await getCandidateBySlug(slug) }
    } catch {
      return { ok: false }
    }
  },
)

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const result = await safeCandidate(slug)
  if (!result.ok || !result.candidate) return { title: BRAND_NAME }
  return pageMetadata({
    title: `${result.candidate.name} | ${BRAND_NAME}`,
    description: `Perfil, propostas e fontes públicas de ${result.candidate.name}, candidato à presidência do Santos em 2026.`,
    path: `/candidatos/${result.candidate.slug}`,
  })
}

export default async function CandidatoPage({ params }: { params: Params }) {
  const { slug } = await params
  const result = await safeCandidate(slug)

  if (!result.ok) return <LoadError />
  const candidate = result.candidate
  if (!candidate) notFound()

  let themes: Theme[]
  let proposals: ProposalWithSources[]
  try {
    ;[themes, proposals] = await Promise.all([getThemes(), getPublishedProposals(candidate.id)])
  } catch {
    return <LoadError />
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={candidatePageJsonLd(candidate.name, candidate.slug)} />
      <CandidateProfile candidate={candidate} themes={themes} proposals={proposals} />
    </main>
  )
}

function LoadError() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
        Não foi possível carregar o perfil agora. Tente novamente em alguns instantes.
      </p>
    </main>
  )
}
