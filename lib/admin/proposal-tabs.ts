export const PROPOSAL_TABS = [
  { id: 'a-publicar', label: 'A publicar', statuses: ['em_revisao'] },
  { id: 'publicadas', label: 'Publicadas', statuses: ['publicada', 'corrigida'] },
  { id: 'retiradas', label: 'Retiradas', statuses: ['retirada'] },
] as const

export type ProposalTabId = (typeof PROPOSAL_TABS)[number]['id']
export const DEFAULT_PROPOSAL_TAB: ProposalTabId = 'a-publicar'

export function parseProposalTab(value: string | undefined): ProposalTabId {
  const found = PROPOSAL_TABS.find((t) => t.id === value)
  return found ? found.id : DEFAULT_PROPOSAL_TAB
}

/** Aba em que uma proposta aparece; situação desconhecida cai em "A publicar" para não sumir. */
export function tabOfStatus(status: string): ProposalTabId {
  const found = PROPOSAL_TABS.find((t) => (t.statuses as readonly string[]).includes(status))
  return found ? found.id : DEFAULT_PROPOSAL_TAB
}
