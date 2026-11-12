import {
  getCandidates,
  getPublishedProposals,
  getThemes,
  isPublicStatus,
  type Candidate,
  type ProposalWithSources,
  type Theme,
} from './queries'

export const MISSING_PROPOSAL_TEXT = 'Não foi localizada proposta pública verificável.'
export const MISSING_FIELD_TEXT = 'Informação pública verificável não localizada.'

export type ComparisonCell =
  | { kind: 'proposal'; proposals: ProposalWithSources[] }
  | { kind: 'missing'; text: string }

export type Comparison = {
  themes: Theme[]
  columns: { candidate: Candidate; cells: ComparisonCell[] }[]
}

export type ComparisonSource = {
  getCandidates(): Promise<Candidate[]>
  getThemes(): Promise<Theme[]>
  getPublishedProposals(candidateId: string): Promise<ProposalWithSources[]>
}

const defaultSource: ComparisonSource = { getCandidates, getThemes, getPublishedProposals }

// Função pura: uma célula por tema para cada candidato, na ordem de `position`.
// Propostas que não sejam publicada/corrigida são descartadas aqui também.
export function composeComparison(
  candidates: Candidate[],
  themes: Theme[],
  proposalsByCandidateId: Record<string, ProposalWithSources[]>,
): Comparison {
  const orderedThemes = [...themes].sort((a, b) => a.position - b.position)
  const columns = candidates.map((candidate) => {
    const visible = (proposalsByCandidateId[candidate.id] ?? []).filter((p) =>
      isPublicStatus(p.status),
    )
    const cells = orderedThemes.map((theme): ComparisonCell => {
      const proposals = visible.filter((p) => p.theme_id === theme.id)
      return proposals.length > 0
        ? { kind: 'proposal', proposals }
        : { kind: 'missing', text: MISSING_PROPOSAL_TEXT }
    })
    return { candidate, cells }
  })
  return { themes: orderedThemes, columns }
}

export async function buildComparison(
  candidateSlugs: string[],
  source: ComparisonSource = defaultSource,
): Promise<Comparison> {
  const [allCandidates, themes] = await Promise.all([source.getCandidates(), source.getThemes()])
  const bySlug = new Map(allCandidates.map((c) => [c.slug, c]))
  const selected: Candidate[] = []
  const seen = new Set<string>()
  for (const slug of candidateSlugs) {
    const candidate = bySlug.get(slug)
    if (!candidate || seen.has(slug)) continue
    seen.add(slug)
    selected.push(candidate)
  }
  const lists = await Promise.all(selected.map((c) => source.getPublishedProposals(c.id)))
  const proposalsByCandidateId: Record<string, ProposalWithSources[]> = {}
  selected.forEach((c, i) => {
    proposalsByCandidateId[c.id] = lists[i]
  })
  return composeComparison(selected, themes, proposalsByCandidateId)
}
