import { BarsChart } from '@/components/charts/BarsChart'
import { DailyChart } from '@/components/charts/DailyChart'
import { PieChart } from '@/components/charts/PieChart'
import type { ResultsFilter, ResultsSummary } from '@/lib/results'

export const BLANK_LABEL = 'Branco/Indeciso'
export const ZERO_PARTICIPANTS_TEXT = 'a simulação ainda não possui participantes'
export const NO_NON_SOCIO_TEXT = 'Ainda não há votos de não sócios'
export const NO_SOCIO_TEXT = 'Ainda não há votos de sócios'
export const SMALL_SAMPLE_MIN = 30

type Props = {
  summary: ResultsSummary
  split: { socio: number; naoSocio: number }
  daily: { day: string; votes: number }[]
  filter: ResultsFilter
  candidates: { id: string; name: string }[]
}

const FILTERS: { value: ResultsFilter; param: string; label: string }[] = [
  { value: 'all', param: 'todos', label: 'Todos' },
  { value: 'socio', param: 'socio', label: 'Só sócios' },
  { value: 'nao_socio', param: 'nao_socio', label: 'Só não sócios' },
]

// dd/mm/yyyy HH:mm em America/Sao_Paulo.
export function formatLastUpdated(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
}

function pct(votes: number, total: number): number {
  return total === 0 ? 0 : Math.round((votes / total) * 1000) / 10
}

export function ResultsPanel({ summary, split, daily, filter, candidates }: Props) {
  const names = new Map(candidates.map((c) => [c.id, c.name]))
  const rows = summary.byCandidate.map((r) => ({
    label: r.candidateId === null ? BLANK_LABEL : (names.get(r.candidateId) ?? 'Candidato'),
    votes: r.votes,
    pct: r.pct,
  }))
  const filterLabel = FILTERS.find((f) => f.value === filter)?.label ?? 'Todos'
  const lastUpdated = summary.lastUpdated ? formatLastUpdated(summary.lastUpdated) : null

  const splitTotal = split.socio + split.naoSocio
  const splitRows = [
    { label: 'Sócios', votes: split.socio, pct: pct(split.socio, splitTotal) },
    { label: 'Não sócios', votes: split.naoSocio, pct: pct(split.naoSocio, splitTotal) },
  ]
  const pieTitle = 'Sócio × Não sócio (autodeclarado)'

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="resultados-gerais" data-testid="section-resultados">
        <h2 id="resultados-gerais" className="text-2xl font-bold">Resultados gerais</h2>
        <p className="mt-1 text-sm text-gray-4">Filtro aplicado: {filterLabel}</p>
        {summary.total === 0 ? (
          <p className="mt-4 text-gray-4 first-letter:uppercase">{ZERO_PARTICIPANTS_TEXT}</p>
        ) : (
          <div className="mt-4 flex flex-col gap-8">
            {summary.total < SMALL_SAMPLE_MIN && (
              <p role="note" className="border border-gray-3 bg-gray-1 p-3 text-sm">
                Amostra pequena: com poucos votos, os números mudam muito a cada novo participante e não devem ser
                lidos como tendência.
              </p>
            )}
            <BarsChart data={rows} title={`Votos por candidato (${filterLabel})`} />
            {daily.length > 0 && <DailyChart data={daily} title={`Votos por dia (${filterLabel})`} />}
          </div>
        )}
        <p className="mt-6 text-sm text-gray-4">Total de votos válidos: {summary.total}</p>
        {lastUpdated && <p className="mt-1 text-sm text-gray-4">Última atualização: {lastUpdated}</p>}
        <p className="mt-1 text-sm text-gray-4">Votos descartados: {summary.discarded}</p>
        <p className="mt-3 text-sm text-gray-4">
          Esta é uma simulação espontânea, aberta a quem quiser participar, e não uma pesquisa científica. Os
          resultados mostram apenas quem votou aqui.
        </p>
      </section>

      <section aria-labelledby="filtro-resultados" data-testid="section-filtro">
        <h2 id="filtro-resultados" className="text-2xl font-bold">Filtro</h2>
        <nav aria-label="Filtro de resultados" className="mt-3">
          <ul className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const current = f.value === filter
              return (
                <li key={f.value}>
                  <a
                    href={`?filtro=${f.param}`}
                    aria-current={current ? 'page' : undefined}
                    className={
                      current
                        ? 'inline-block border border-ink bg-ink px-4 py-2 text-sm font-semibold text-paper'
                        : 'inline-block border border-gray-3 px-4 py-2 text-sm text-ink underline-offset-4 hover:underline'
                    }
                  >
                    {f.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
        <p className="mt-2 text-sm text-gray-4">O filtro vale para os resultados gerais e os votos por dia.</p>
      </section>

      <section aria-labelledby="socio-nao-socio" data-testid="section-pizza">
        <h2 id="socio-nao-socio" className="text-2xl font-bold">{pieTitle}</h2>
        <p className="mt-1 text-sm text-gray-4">
          A condição de sócio é informada pelo próprio eleitor e não é verificada. Esta seção sempre considera todos
          os votos válidos.
        </p>
        <div className="mt-4">
          {splitTotal === 0 ? (
            <p className="text-gray-4 first-letter:uppercase">{ZERO_PARTICIPANTS_TEXT}</p>
          ) : (
            <>
              {split.naoSocio === 0 && <p className="mb-4">{NO_NON_SOCIO_TEXT}</p>}
              {split.socio === 0 && <p className="mb-4">{NO_SOCIO_TEXT}</p>}
              <PieChart data={splitRows} title={pieTitle} hideChart={split.socio === 0 || split.naoSocio === 0} />
            </>
          )}
        </div>
      </section>
    </div>
  )
}
