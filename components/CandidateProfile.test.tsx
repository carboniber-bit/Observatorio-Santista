import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MISSING_FIELD_TEXT, MISSING_PROPOSAL_TEXT } from '@/lib/editorial/comparison'
import { PROFILE_FIELD_LABELS } from '@/lib/editorial/labels'
import type { Candidate, ProposalWithSources, Source, Theme } from '@/lib/editorial/queries'
import { CandidateProfile } from './CandidateProfile'

afterEach(cleanup)

function candidate(over: Partial<Candidate> & { slug: string; name: string }): Candidate {
  return {
    id: `c-${over.slug}`,
    ticket_name: null,
    vice: null,
    status: 'confirmada',
    bio: 'Bio padrão',
    club_history: 'Histórico padrão',
    trajectory: 'Trajetória padrão',
    photo_url: null,
    updated_at: '2026-11-01T12:00:00Z',
    ...over,
  }
}

const themes: Theme[] = [
  { id: 't1', slug: 'tema-1', name: 'Tema Um', position: 1 },
  { id: 't2', slug: 'tema-2', name: 'Tema Dois', position: 2 },
]

function source(over: Partial<Source> = {}): Source {
  return {
    id: 's1',
    proposal_id: 'p1',
    url: 'https://exemplo.com/materia',
    outlet: 'Jornal Exemplo',
    published_on: '2026-10-05',
    consulted_on: '2026-11-08',
    kind: 'reportagem',
    excerpt: 'Trecho da matéria',
    ...over,
  }
}

function proposal(over: Partial<ProposalWithSources> = {}): ProposalWithSources {
  return {
    id: 'p1',
    candidate_id: 'c',
    theme_id: 't1',
    description: 'Proposta de teste',
    source_kind: 'reportagem',
    reference_year: 2026,
    status: 'publicada',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z',
    sources: [source()],
    ...over,
  }
}

function labels(): string[] {
  return screen.getAllByTestId('profile-label').map((el) => el.textContent ?? '')
}

describe('CandidateProfile', () => {
  const four = [
    {
      c: candidate({ slug: 'a', name: 'Marcelo Teixeira' }),
      p: [proposal({ source_kind: 'entrevista_direta' }), proposal({ id: 'p2', theme_id: 't2', sources: [source({ id: 's2', url: 'https://exemplo.com/2' })] })],
    },
    { c: candidate({ slug: 'b', name: 'Beta Silva', bio: '' }), p: [proposal()] },
    { c: candidate({ slug: 'c', name: 'Gama Souza', photo_url: 'https://exemplo.com/f.jpg' }), p: [proposal()] },
    { c: candidate({ slug: 'd', name: 'Delta Lima', bio: null }), p: [] },
  ]

  it.each(four.map((x) => [x.c.name, x] as const))('%s: mesma lista de rótulos na mesma ordem', (_n, x) => {
    render(<CandidateProfile candidate={x.c} themes={themes} proposals={x.p} />)
    expect(labels()).toEqual([...PROFILE_FIELD_LABELS])
  })

  it('campo vazio mostra a frase de informação não localizada', () => {
    render(<CandidateProfile candidate={candidate({ slug: 'b', name: 'Beta Silva', bio: '  ' })} themes={themes} proposals={[]} />)
    expect(screen.getAllByText(MISSING_FIELD_TEXT).length).toBeGreaterThanOrEqual(1)
  })

  it('tema sem proposta mostra o texto padrão', () => {
    render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={themes} proposals={[proposal()]} />)
    expect(screen.getAllByText(MISSING_PROPOSAL_TEXT)).toHaveLength(1)
  })

  it('fonte fechada não expõe URL; aberta mostra todos os campos', () => {
    render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={[themes[0]]} proposals={[proposal({ source_kind: 'documento_da_chapa' })]} />)
    expect(screen.queryByText('Trecho comprobatório')).not.toBeInTheDocument()
    expect(screen.queryByText('URL')).not.toBeInTheDocument()
    expect(screen.queryByText('Data da consulta')).not.toBeInTheDocument()
    const btn = screen.getByRole('button', { name: 'Fonte e verificação' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    for (const l of ['URL', 'Veículo', 'Data da publicação', 'Data da consulta', 'Tipo', 'Trecho comprobatório']) {
      expect(screen.getByText(l)).toBeInTheDocument()
    }
    const links = screen.getAllByText('https://exemplo.com/materia').map((el) => el.closest('a'))
    links.forEach((a) => expect(a).toHaveAttribute('href', 'https://exemplo.com/materia'))
    expect(screen.getAllByText('Jornal Exemplo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('05/10/2026').length).toBeGreaterThan(0)
    expect(screen.getByText('08/11/2026')).toBeInTheDocument()
    expect(screen.getByText('Trecho da matéria')).toBeInTheDocument()
  })

  it('selo de ano só para referência anterior a 2026', () => {
    const { unmount } = render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={themes} proposals={[proposal({ reference_year: 2023 })]} />)
    expect(screen.getByText('Referência de 2023')).toBeInTheDocument()
    unmount()
    render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={themes} proposals={[proposal({ reference_year: 2026 })]} />)
    expect(screen.queryByText(/Referência de/)).not.toBeInTheDocument()
  })

  it('selo do tipo de fonte', () => {
    render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={themes} proposals={[proposal({ source_kind: 'declaracao_como_presidente' })]} />)
    expect(screen.getAllByText('Declaração como presidente em exercício').length).toBeGreaterThan(0)
  })

  it('sem foto mostra iniciais; com foto mostra img com alt', () => {
    const { unmount } = render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Marcelo Teixeira' })} themes={themes} proposals={[]} />)
    expect(screen.getByText('MT')).toBeInTheDocument()
    unmount()
    const { unmount: u2 } = render(<CandidateProfile candidate={candidate({ slug: 'j', name: 'José Renato Quaresma' })} themes={themes} proposals={[]} />)
    expect(screen.getByText('JQ')).toBeInTheDocument()
    u2()
    render(<CandidateProfile candidate={candidate({ slug: 'g', name: 'Gama Souza', photo_url: 'https://exemplo.com/f.jpg' })} themes={themes} proposals={[]} />)
    expect(screen.getByAltText('Gama Souza')).toBeInTheDocument()
    expect(screen.queryByText('GS')).not.toBeInTheDocument()
  })

  it('URL javascript: não vira link', () => {
    const bad = source({ url: 'javascript:alert(1)' })
    const { container } = render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={themes} proposals={[proposal({ sources: [bad] })]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fonte e verificação' }))
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(screen.getAllByText('javascript:alert(1)').length).toBeGreaterThan(0)
  })

  it('<script> na descrição é texto', () => {
    const { container } = render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={themes} proposals={[proposal({ description: '<script>alert(1)</script>' })]} />)
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })

  it('proposta em revisão não aparece', () => {
    render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={themes} proposals={[proposal({ status: 'em_revisao', description: 'Oculta' })]} />)
    expect(screen.queryByText('Oculta')).not.toBeInTheDocument()
  })

  it('sem fontes cadastradas mostra a nota', () => {
    render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana' })} themes={themes} proposals={[proposal({ sources: [] })]} />)
    expect(screen.getByText('Sem fonte cadastrada.')).toBeInTheDocument()
  })

  it('data da última atualização usa a mais recente', () => {
    render(<CandidateProfile candidate={candidate({ slug: 'a', name: 'Ana', updated_at: '2026-11-01T12:00:00Z' })} themes={themes} proposals={[proposal({ updated_at: '2026-11-10T12:00:00Z' })]} />)
    expect(screen.getByText('10/11/2026')).toBeInTheDocument()
  })
})
