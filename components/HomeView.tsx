import Link from 'next/link'
import type { News } from '@/lib/editorial/content'
import { formatDatePtBr } from '@/lib/editorial/labels'
import type { Candidate, ProposalWithSources } from '@/lib/editorial/queries'
import { EditorialText } from '@/lib/editorial/text'
import type { ResultsSummary } from '@/lib/results'

export const HOME_TITLE = 'ELEIÇÃO SANTOS 2026'
export const HOME_SUBTITLE =
  'O futuro do Santos em debate. Informação, propostas e participação da torcida.'
export const HOME_PRESENTATION =
  'Um observatório independente criado para acompanhar a eleição presidencial do Santos Futebol Clube em 2026. Conheça os candidatos, compare propostas verificadas, acompanhe a disputa e participe da nossa simulação de intenção de voto.'
export const NO_PARTICIPANTS = 'a simulação ainda não possui participantes'

export type HomeProposal = { candidateName: string; proposal: ProposalWithSources }

// Cada seção aceita null = falha ao carregar; a home continua renderizando.
export type HomeViewProps = {
  summary: ResultsSummary | null
  candidates: Candidate[] | null
  news: News[] | null
  proposals: HomeProposal[] | null
}

const LINK_BUTTON =
  'inline-flex min-h-11 items-center border border-ink px-5 py-2 font-semibold underline-offset-4 hover:underline'

function SectionError({ what }: { what: string }) {
  return (
    <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
      Não foi possível carregar {what} agora. Tente novamente em alguns instantes.
    </p>
  )
}

function percent(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function Simulation({ summary, candidates }: { summary: ResultsSummary | null; candidates: Candidate[] | null }) {
  if (summary === null || candidates === null) return <SectionError what="a simulação" />
  if (summary.total === 0) {
    return <p className="border border-gray-3 bg-gray-1 p-4 first-letter:uppercase">{NO_PARTICIPANTS}</p>
  }
  const blank = summary.byCandidate.find((r) => r.candidateId === null)
  return (
    <div className="space-y-4">
      <p>
        Total de votos na simulação: <strong>{summary.total}</strong>
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {candidates.map((c) => {
          const row = summary.byCandidate.find((r) => r.candidateId === c.id)
          return (
            <li key={c.id} className="border border-gray-3 p-4">
              <p className="font-semibold">{c.name}</p>
              <p>{percent(row?.pct ?? 0)}</p>
            </li>
          )
        })}
      </ul>
      {blank && (
        <p className="text-sm text-gray-4">
          Branco/Indeciso: {percent(blank.pct)}. Percentuais calculados sobre o total de votos.
        </p>
      )}
    </div>
  )
}

export function HomeView({ summary, candidates, news, proposals }: HomeViewProps) {
  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold sm:text-4xl">{HOME_TITLE}</h1>
        <p className="text-lg font-semibold">{HOME_SUBTITLE}</p>
        <p className="max-w-3xl">{HOME_PRESENTATION}</p>
      </header>

      <section aria-labelledby="simulacao" className="space-y-4">
        <h2 id="simulacao" className="text-2xl font-bold">
          Simulação de intenção de voto
        </h2>
        <p>Votação espontânea e informal, sem valor de pesquisa científica.</p>
        <Simulation summary={summary} candidates={candidates} />
        <p className="flex flex-wrap gap-3">
          <Link href="/votar" className={`${LINK_BUTTON} bg-ink text-paper`}>
            Participe da simulação
          </Link>
          <Link href="/resultados" className={LINK_BUTTON}>
            Ver resultados
          </Link>
        </p>
      </section>

      <section aria-labelledby="candidatos" className="space-y-4">
        <h2 id="candidatos" className="text-2xl font-bold">
          Candidatos
        </h2>
        {candidates === null ? (
          <SectionError what="os candidatos" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {candidates.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/candidatos/${c.slug}`}
                  className={`flex min-h-11 items-center border border-gray-3 p-4 font-semibold underline-offset-4 hover:underline${c.status === 'desistiu' ? ' text-danger' : ''}`}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link href="/comparador" className={LINK_BUTTON}>
            Comparar propostas
          </Link>
        </p>
      </section>

      <section aria-labelledby="propostas" className="space-y-4">
        <h2 id="propostas" className="text-2xl font-bold">
          Últimas propostas publicadas
        </h2>
        {proposals === null ? (
          <SectionError what="as propostas" />
        ) : proposals.length === 0 ? (
          <p className="border border-gray-3 bg-gray-1 p-4">Nenhuma proposta publicada ainda.</p>
        ) : (
          <ul className="space-y-4">
            {proposals.map(({ candidateName, proposal }) => (
              <li key={proposal.id} className="border border-gray-3 p-4">
                <h3 className="font-semibold">{candidateName}</h3>
                <p>
                  <EditorialText value={proposal.description} />
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="noticias" className="space-y-4">
        <h2 id="noticias" className="text-2xl font-bold">
          Últimas notícias
        </h2>
        {news === null ? (
          <SectionError what="as notícias" />
        ) : news.length === 0 ? (
          <p className="border border-gray-3 bg-gray-1 p-4">Nenhuma notícia publicada ainda.</p>
        ) : (
          <ul className="space-y-4">
            {news.map((n) => (
              <li key={n.id} className="border border-gray-3 p-4">
                <h3 className="font-semibold">
                  <EditorialText value={n.title} />
                </h3>
                {n.published_at ? <p className="text-sm text-gray-4">{formatDatePtBr(n.published_at)}</p> : null}
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link href="/noticias" className={LINK_BUTTON}>
            Todas as notícias
          </Link>
        </p>
      </section>
    </main>
  )
}
