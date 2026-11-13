import type { Analysis } from '@/lib/editorial/content'
import { MISSING_FIELD_TEXT } from '@/lib/editorial/comparison'
import { formatDatePtBr } from '@/lib/editorial/labels'
import { EditorialText } from '@/lib/editorial/text'
import { ProvenanceBadge } from './ProvenanceBadge'

function Block({ heading, value, note }: { heading: string; value: string; note?: string }) {
  return (
    <section className="space-y-3 border-t border-gray-3 pt-6">
      <h2 className="font-serif text-2xl font-bold">{heading}</h2>
      {note ? <p className="text-sm text-gray-4">{note}</p> : null}
      <p>
        <EditorialText value={value.trim() === '' ? MISSING_FIELD_TEXT : value} />
      </p>
    </section>
  )
}

export function AnalysisView({ analysis }: { analysis: Analysis }) {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-serif text-3xl font-bold sm:text-4xl">
          <EditorialText value={analysis.title} />
        </h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-4">
          <ProvenanceBadge badge="editorial" />
          {analysis.published_at ? <span>{formatDatePtBr(analysis.published_at)}</span> : null}
        </p>
      </header>
      <Block heading="Fatos" value={analysis.facts} />
      <Block heading="Declarações dos candidatos" value={analysis.candidate_statements} />
      <Block
        heading="Interpretação editorial"
        value={analysis.editorial_interpretation}
        note="Esta seção expressa a leitura da equipe do Observatório e não é um fato verificado."
      />
    </article>
  )
}
