import { describe, it, expect } from 'vitest'
import {
  MISSING_PROPOSAL_TEXT,
  buildComparison,
  composeComparison,
  type ComparisonSource,
} from './comparison'
import { sortCandidates, type Candidate, type ProposalWithSources, type Theme } from './queries'

function candidate(slug: string, name: string): Candidate {
  return {
    id: `c-${slug}`,
    slug,
    name,
    ticket_name: null,
    vice: null,
    status: 'ativo',
    bio: null,
    club_history: null,
    trajectory: null,
    photo_url: null,
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function theme(position: number): Theme {
  return { id: `t${position}`, slug: `tema-${position}`, name: `Tema ${position}`, position }
}

function proposal(
  id: string,
  candidateId: string,
  themeId: string,
  status = 'publicada',
): ProposalWithSources {
  return {
    id,
    candidate_id: candidateId,
    theme_id: themeId,
    description: `Descrição ${id}`,
    source_kind: 'plano',
    reference_year: 2026,
    status,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    sources: [],
  }
}

const A = candidate('ana', 'Ana')
const B = candidate('bruno', 'Bruno')
const C = candidate('carlos', 'Carlos')
// 9 temas embaralhados
const THEMES = [5, 1, 9, 3, 7, 2, 8, 4, 6].map(theme)

function fakeSource(proposals: Record<string, ProposalWithSources[]>): ComparisonSource {
  return {
    getCandidates: async () => [A, B, C],
    getThemes: async () => THEMES,
    getPublishedProposals: async (id) => proposals[id] ?? [],
  }
}

describe('composeComparison', () => {
  it('tema sem proposta vira célula missing com o texto exato', () => {
    const r = composeComparison([A], THEMES, { [A.id]: [proposal('p1', A.id, 't1')] })
    expect(r.columns[0].cells[1]).toEqual({
      kind: 'missing',
      text: 'Não foi localizada proposta pública verificável.',
    })
    expect(MISSING_PROPOSAL_TEXT).toBe('Não foi localizada proposta pública verificável.')
  })

  it('em_revisao e retirada nunca aparecem, mesmo vindas da fonte', () => {
    const r = composeComparison([A], THEMES, {
      [A.id]: [proposal('p1', A.id, 't1', 'em_revisao'), proposal('p2', A.id, 't2', 'retirada')],
    })
    for (const cell of r.columns[0].cells) expect(cell.kind).toBe('missing')
  })

  it('aceita publicada e corrigida', () => {
    const r = composeComparison([A], THEMES, {
      [A.id]: [proposal('p1', A.id, 't1', 'corrigida'), proposal('p2', A.id, 't2', 'publicada')],
    })
    expect(r.columns[0].cells[0].kind).toBe('proposal')
    expect(r.columns[0].cells[1].kind).toBe('proposal')
  })

  it('tema com duas propostas mantém as duas, na ordem de entrada', () => {
    const r = composeComparison([A], THEMES, {
      [A.id]: [proposal('p1', A.id, 't3'), proposal('p2', A.id, 't3', 'corrigida')],
    })
    const cell = r.columns[0].cells[2]
    expect(cell.kind).toBe('proposal')
    if (cell.kind === 'proposal') {
      expect(cell.proposals.map((p) => p.id)).toEqual(['p1', 'p2'])
    }
  })
})

describe('buildComparison', () => {
  it('2 slugs => 2 colunas com 9 células na ordem de position', async () => {
    const r = await buildComparison(['bruno', 'ana'], fakeSource({}))
    expect(r.themes.map((t) => t.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(r.columns).toHaveLength(2)
    expect(r.columns.map((c) => c.candidate.slug)).toEqual(['bruno', 'ana'])
    for (const col of r.columns) expect(col.cells).toHaveLength(9)
  })

  it('célula fica alinhada ao tema pela position, não pela ordem de entrada', async () => {
    const r = await buildComparison(
      ['ana'],
      fakeSource({ [A.id]: [proposal('p1', A.id, 't9')] }),
    )
    const cells = r.columns[0].cells
    expect(cells[8].kind).toBe('proposal')
    for (let i = 0; i < 8; i++) expect(cells[i].kind).toBe('missing')
  })

  it('remove slugs duplicados e omite desconhecidos', async () => {
    const r = await buildComparison(['ana', 'zzz', 'ana', 'carlos'], fakeSource({}))
    expect(r.columns.map((c) => c.candidate.slug)).toEqual(['ana', 'carlos'])
  })

  it('filtra em_revisao/retirada vindas da fonte', async () => {
    const r = await buildComparison(
      ['ana'],
      fakeSource({
        [A.id]: [proposal('p1', A.id, 't1', 'em_revisao'), proposal('p2', A.id, 't1', 'retirada')],
      }),
    )
    expect(r.columns[0].cells[0].kind).toBe('missing')
  })

  it('sem slugs válidos devolve zero colunas', async () => {
    const r = await buildComparison([], fakeSource({}))
    expect(r.columns).toHaveLength(0)
    expect(r.themes).toHaveLength(9)
  })
})

describe('sortCandidates', () => {
  it('ordena por nome em pt-BR sem mutar a entrada', () => {
    const input = [
      candidate('m', 'Maurício'),
      candidate('j', 'José Renato'),
      candidate('ma', 'Marcelo'),
      candidate('i', 'Ivan'),
    ]
    const sorted = sortCandidates(input)
    expect(sorted.map((c) => c.name)).toEqual(['Ivan', 'José Renato', 'Marcelo', 'Maurício'])
    expect(input[0].name).toBe('Maurício')
  })
})
