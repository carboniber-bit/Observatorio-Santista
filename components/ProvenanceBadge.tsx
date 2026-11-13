import { BADGE_LABELS, type Badge } from '@/lib/editorial/labels'

// O texto do selo carrega o significado; a borda apenas o delimita.
export function ProvenanceBadge({ badge }: { badge: Badge }) {
  return (
    <span className="inline-block border border-ink px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink">
      {BADGE_LABELS[badge]}
    </span>
  )
}
