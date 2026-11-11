import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { summarize } from '@/lib/results'
import type { ResultsFilter } from '@/lib/results'
import { ResultsPanel } from './ResultsPanel'

const candidates = [
  { id: 'a', name: 'Candidato A' },
  { id: 'b', name: 'Candidato B' },
]

function panel(opts: {
  rows: { candidate_id: string | null; votes: number }[]
  split: { socio: number; naoSocio: number }
  filter?: ResultsFilter
  lastUpdated?: string | null
  discarded?: number
  daily?: { day: string; votes: number }[]
}) {
  const summary = summarize(opts.rows, opts.discarded ?? 0, opts.lastUpdated ?? null)
  return render(
    <ResultsPanel
      summary={summary}
      split={opts.split}
      daily={opts.daily ?? []}
      filter={opts.filter ?? 'all'}
      candidates={candidates}
    />,
  )
}

const zeroRows = [
  { candidate_id: 'a', votes: 0 },
  { candidate_id: 'b', votes: 0 },
  { candidate_id: null, votes: 0 },
]

describe('ResultsPanel', () => {
  it('com zero votos mostra a mensagem de zero participantes e nenhum %', () => {
    const { container } = panel({ rows: zeroRows, split: { socio: 0, naoSocio: 0 } })
    expect(screen.getAllByText('a simulação ainda não possui participantes').length).toBeGreaterThan(0)
    expect(container.textContent).not.toContain('%')
    expect(screen.queryByTestId('pie-chart')).toBeNull()
    expect(screen.queryByText(/Amostra pequena:/)).toBeNull()
  })

  it('só sócios: mostra "Ainda não há votos de não sócios" no lugar da pizza, com a tabela', () => {
    panel({
      rows: [
        { candidate_id: 'a', votes: 4 },
        { candidate_id: 'b', votes: 1 },
        { candidate_id: null, votes: 0 },
      ],
      split: { socio: 5, naoSocio: 0 },
    })
    const section = screen.getByTestId('section-pizza')
    expect(within(section).getByText('Ainda não há votos de não sócios')).toBeInTheDocument()
    expect(screen.queryByTestId('pie-chart')).toBeNull()
    expect(within(section).getByRole('table')).toBeInTheDocument()
  })

  it('só não sócios: mostra "Ainda não há votos de sócios"', () => {
    panel({ rows: [{ candidate_id: 'a', votes: 2 }], split: { socio: 0, naoSocio: 2 } })
    expect(screen.getByText('Ainda não há votos de sócios')).toBeInTheDocument()
    expect(screen.queryByTestId('pie-chart')).toBeNull()
  })

  it('com votos dos dois lados mostra a pizza (role img) e a tabela', () => {
    panel({ rows: [{ candidate_id: 'a', votes: 3 }], split: { socio: 2, naoSocio: 1 } })
    expect(screen.queryByText('Ainda não há votos de não sócios')).toBeNull()
    const pie = screen.getByTestId('pie-chart')
    expect(pie).toHaveAttribute('role', 'img')
    expect(pie).toHaveAttribute('aria-label')
  })

  it('abaixo de 30 votos mostra o aviso de amostra pequena', () => {
    panel({ rows: [{ candidate_id: 'a', votes: 29 }], split: { socio: 20, naoSocio: 9 } })
    expect(screen.getByText(/^Amostra pequena:/)).toBeInTheDocument()
  })

  it('com 30 votos ou mais não mostra o aviso', () => {
    panel({ rows: [{ candidate_id: 'a', votes: 30 }], split: { socio: 20, naoSocio: 10 } })
    expect(screen.queryByText(/Amostra pequena:/)).toBeNull()
  })

  it('o rótulo da pizza contém "autodeclarado"', () => {
    panel({ rows: [{ candidate_id: 'a', votes: 3 }], split: { socio: 2, naoSocio: 1 } })
    expect(screen.getByRole('heading', { name: /autodeclarado/ })).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart').getAttribute('aria-label')).toContain('autodeclarado')
  })

  it('ordem: resultados gerais, filtro, pizza', () => {
    panel({ rows: [{ candidate_id: 'a', votes: 3 }], split: { socio: 2, naoSocio: 1 } })
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Resultados gerais', 'Filtro', 'Sócio × Não sócio (autodeclarado)'])
    const [a, b, c] = ['section-resultados', 'section-filtro', 'section-pizza'].map((id) => screen.getByTestId(id))
    expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(b.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('links do filtro apontam para ?filtro= e o atual tem aria-current', () => {
    panel({ rows: [{ candidate_id: 'a', votes: 3 }], split: { socio: 2, naoSocio: 1 }, filter: 'socio' })
    const nav = screen.getByRole('navigation', { name: 'Filtro de resultados' })
    const todos = within(nav).getByRole('link', { name: 'Todos' })
    const socio = within(nav).getByRole('link', { name: 'Só sócios' })
    const naoSocio = within(nav).getByRole('link', { name: 'Só não sócios' })
    expect(todos).toHaveAttribute('href', '?filtro=todos')
    expect(socio).toHaveAttribute('href', '?filtro=socio')
    expect(naoSocio).toHaveAttribute('href', '?filtro=nao_socio')
    expect(socio).toHaveAttribute('aria-current', 'page')
    expect(todos).not.toHaveAttribute('aria-current')
    expect(naoSocio).not.toHaveAttribute('aria-current')
  })

  it('a tabela de resultados traz nomes, Branco/Indeciso por último, caption e th scope', () => {
    panel({
      rows: [
        { candidate_id: null, votes: 9 },
        { candidate_id: 'a', votes: 3 },
        { candidate_id: 'b', votes: 6 },
      ],
      split: { socio: 10, naoSocio: 8 },
    })
    const table = within(screen.getByTestId('section-resultados')).getAllByRole('table')[0]
    expect(within(table).getByText(/^Votos por candidato/)).toBeInTheDocument()
    const rowHeaders = within(table).getAllByRole('rowheader').map((h) => h.textContent?.trim())
    expect(rowHeaders).toEqual(['Candidato B', 'Candidato A', 'Branco/Indeciso'])
    for (const th of within(table).getAllByRole('columnheader')) {
      expect(th).toHaveAttribute('scope', 'col')
    }
  })

  it('mostra última atualização em horário de São Paulo e votos descartados', () => {
    panel({
      rows: [{ candidate_id: 'a', votes: 3 }],
      split: { socio: 2, naoSocio: 1 },
      lastUpdated: '2026-11-20T15:05:00Z',
      discarded: 4,
    })
    expect(screen.getByText('Última atualização: 20/11/2026 12:05')).toBeInTheDocument()
    expect(screen.getByText('Votos descartados: 4')).toBeInTheDocument()
  })

  it('sem lastUpdated não mostra a linha de atualização', () => {
    panel({ rows: zeroRows, split: { socio: 0, naoSocio: 0 } })
    expect(screen.queryByText(/Última atualização/)).toBeNull()
    expect(screen.getByText('Votos descartados: 0')).toBeInTheDocument()
  })

  it('avisa que a simulação é espontânea e não é pesquisa científica', () => {
    panel({ rows: zeroRows, split: { socio: 0, naoSocio: 0 } })
    expect(screen.getByText(/não uma pesquisa científica/)).toBeInTheDocument()
  })

  it('a série diária ganha tabela acessível', () => {
    panel({
      rows: [{ candidate_id: 'a', votes: 3 }],
      split: { socio: 2, naoSocio: 1 },
      daily: [{ day: '2026-11-10', votes: 2 }],
    })
    expect(screen.getByTestId('daily-chart')).toHaveAttribute('role', 'img')
    expect(screen.getByText('10/11/2026')).toBeInTheDocument()
  })
})
