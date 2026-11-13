import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MISSING_PROPOSAL_TEXT, composeComparison } from '@/lib/editorial/comparison'
import type { Candidate, ProposalWithSources, Theme } from '@/lib/editorial/queries'
import { ComparatorTable } from './ComparatorTable'

afterEach(cleanup)

function cand(slug: string, name: string): Candidate {
  return { id: `c-${slug}`, slug, name, ticket_name: null, vice: null, status: 'confirmada', bio: null, club_history: null, trajectory: null, photo_url: null, updated_at: '2026-01-01T00:00:00Z' }
}
const themes: Theme[] = Array.from({ length: 9 }, (_, i) => ({ id: `t${i + 1}`, slug: `t${i + 1}`, name: `Tema ${i + 1}`, position: i + 1 }))
const prop: ProposalWithSources = {
  id: 'p1', candidate_id: 'c-ana', theme_id: 't1', description: 'Descrição da Ana', source_kind: 'reportagem', reference_year: 2022,
  status: 'publicada', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', sources: [],
}

function table() {
  const comparison = composeComparison([cand('ana', 'Ana'), cand('beto', 'Beto')], themes, { 'c-ana': [prop] })
  return render(<ComparatorTable comparison={comparison} />)
}

describe('ComparatorTable', () => {
  it('tem caption, região rolável e escopos de cabeçalho', () => {
    table()
    expect(screen.getByRole('region', { name: 'Tabela comparativa de propostas' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByText('Comparação de propostas verificadas por tema')).toBeInTheDocument()
    const cols = screen.getAllByRole('columnheader')
    expect(cols.filter((c) => c.getAttribute('scope') === 'col')).toHaveLength(3)
    expect(screen.getByRole('columnheader', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Beto' })).toBeInTheDocument()
    const rows = screen.getAllByRole('rowheader')
    expect(rows).toHaveLength(9)
    rows.forEach((r) => expect(r).toHaveAttribute('scope', 'row'))
  })

  it('células ausentes mostram exatamente o texto padrão', () => {
    table()
    // Ana: 8 ausentes; Beto: 9 ausentes
    expect(screen.getAllByText(MISSING_PROPOSAL_TEXT)).toHaveLength(17)
  })

  it('célula com proposta mostra descrição, selo e ano', () => {
    table()
    const row = screen.getByRole('rowheader', { name: 'Tema 1' }).closest('tr') as HTMLElement
    expect(within(row).getByText('Descrição da Ana')).toBeInTheDocument()
    expect(within(row).getByText('Reportagem')).toBeInTheDocument()
    expect(within(row).getByText('Referência de 2022')).toBeInTheDocument()
    expect(within(row).getByText('Sem fonte cadastrada.')).toBeInTheDocument()
    expect(within(row).getByText(MISSING_PROPOSAL_TEXT)).toBeInTheDocument()
  })
})
