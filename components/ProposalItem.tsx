import { sourceKindLabel } from '@/lib/editorial/labels'
import type { ProposalWithSources } from '@/lib/editorial/queries'
import { EditorialText } from '@/lib/editorial/text'
import { SourcePopover } from './SourcePopover'

// Renderização única de uma proposta, usada no perfil e no comparador.
export function ProposalItem({ proposal }: { proposal: ProposalWithSources }) {
  const showYear = proposal.reference_year !== null && proposal.reference_year < 2026
  return (
    <div className="space-y-2">
      <p>
        <EditorialText value={proposal.description} />
      </p>
      <p className="flex flex-wrap gap-2 text-xs">
        <span className="border border-gray-3 px-2 py-1">{sourceKindLabel(proposal.source_kind)}</span>
        {showYear && (
          <span className="border border-gray-3 px-2 py-1">Referência de {proposal.reference_year}</span>
        )}
      </p>
      <SourcePopover sources={proposal.sources} />
    </div>
  )
}
