import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AnalysisView } from '@/components/AnalysisView'
import { ChangeLogList } from '@/components/ChangeLogList'
import { NewsList } from '@/components/NewsList'
import { MISSING_FIELD_TEXT } from '@/lib/editorial/comparison'
import { CHANGE_AUTHOR_LABEL } from '@/lib/editorial/changelog'
import type { Analysis, News } from '@/lib/editorial/content'
import { findForbiddenPhrases } from '@/lib/editorial/neutrality'

afterEach(cleanup)

function analysis(over: Partial<Analysis> = {}): Analysis {
  return {
    id: 'a1',
    slug: 'a1',
    title: 'Análise das propostas de governança',
    facts: 'Fato verificado 1',
    candidate_statements: 'Declaração pública registrada',
    editorial_interpretation: 'Leitura da equipe',
    status: 'publicada',
    published_at: '2026-11-10T12:00:00Z',
    updated_at: '2026-11-10T12:00:00Z',
    ...over,
  }
}

describe('AnalysisView', () => {
  it('renderiza três blocos com os títulos exatos e na ordem', () => {
    render(<AnalysisView analysis={analysis()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Análise das propostas de governança',
    )
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(h2).toEqual(['Fatos', 'Declarações dos candidatos', 'Interpretação editorial'])
    expect(screen.getByText('Fato verificado 1')).toBeInTheDocument()
    expect(screen.getByText('Declaração pública registrada')).toBeInTheDocument()
    expect(screen.getByText('Leitura da equipe')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Esta seção expressa a leitura da equipe do Observatório e não é um fato verificado.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Análise editorial')).toBeInTheDocument()
    expect(screen.getByText('10/11/2026')).toBeInTheDocument()
  })

  it('bloco em branco mostra o texto de informação não localizada', () => {
    render(<AnalysisView analysis={analysis({ facts: '   ' })} />)
    expect(screen.getAllByText(MISSING_FIELD_TEXT)).toHaveLength(1)
  })

  it('renderiza <script> como texto', () => {
    const { container } = render(
      <AnalysisView analysis={analysis({ facts: '<script>alert(1)</script>' })} />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
  })
})

describe('varredura de neutralidade', () => {
  const sampleNews: News = {
    id: 'n1',
    slug: 'n1',
    title: 'Regras da votação',
    body: 'Explicação das regras do processo eleitoral.',
    category: 'estatuto-e-regras',
    badge: 'plataforma',
    source_url: 'https://exemplo.com/regras',
    status: 'publicada',
    published_at: '2026-11-08T15:00:00Z',
    updated_at: '2026-11-08T15:00:00Z',
  }

  it('NewsList não contém expressões proibidas', () => {
    const { container } = render(<NewsList items={[sampleNews]} category={null} />)
    expect(findForbiddenPhrases(container.textContent ?? '')).toEqual([])
  })

  it('AnalysisView não contém expressões proibidas', () => {
    const { container } = render(<AnalysisView analysis={analysis()} />)
    expect(findForbiddenPhrases(container.textContent ?? '')).toEqual([])
  })

  it('ChangeLogList não contém expressões proibidas', () => {
    const { container } = render(
      <ChangeLogList
        entries={[
          {
            id: 'e1',
            changedAt: '2026-11-12T15:05:00Z',
            tableName: 'analyses',
            reason: 'Atualização de fonte',
            sourceUrl: null,
            author: CHANGE_AUTHOR_LABEL,
            oldValue: { status: 'rascunho' },
            newValue: { status: 'publicada' },
          },
        ]}
      />,
    )
    expect(findForbiddenPhrases(container.textContent ?? '')).toEqual([])
  })
})
