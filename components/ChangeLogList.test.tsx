import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CHANGE_AUTHOR_LABEL, type ChangeLogEntry } from '@/lib/editorial/changelog'
import { ChangeLogList } from './ChangeLogList'

afterEach(cleanup)

function entry(over: Partial<ChangeLogEntry> = {}): ChangeLogEntry {
  return {
    id: 'e1',
    changedAt: '2026-11-12T15:05:00Z',
    tableName: 'proposals',
    reason: 'Correção de redação',
    sourceUrl: 'https://exemplo.com/fonte',
    author: CHANGE_AUTHOR_LABEL,
    oldValue: { description: 'a' },
    newValue: { description: 'b' },
    ...over,
  }
}

describe('ChangeLogList', () => {
  it('mantém a ordem recebida (mais recente primeiro)', () => {
    render(
      <ChangeLogList
        entries={[
          entry({ id: 'novo', reason: 'Motivo novo', changedAt: '2026-11-12T15:05:00Z' }),
          entry({ id: 'velho', reason: 'Motivo velho', changedAt: '2026-11-01T10:00:00Z' }),
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Motivo novo')
    expect(items[1]).toHaveTextContent('Motivo velho')
  })

  it('mostra data, tabela, motivo, campos, fonte e autor', () => {
    const { container } = render(<ChangeLogList entries={[entry()]} />)
    const time = container.querySelector('time')
    expect(time).toHaveAttribute('datetime', '2026-11-12T15:05:00Z')
    expect(time).toHaveTextContent('12/11/2026 12:05')
    expect(screen.getByText('Proposta')).toBeInTheDocument()
    expect(screen.getByText('Edição')).toBeInTheDocument()
    expect(screen.getByText('Correção de redação')).toBeInTheDocument()
    expect(screen.getByText('Alterado:').parentElement).toHaveTextContent('Alterado: Descrição')
    const fonte = screen.getByRole('link', { name: 'Fonte' })
    expect(fonte).toHaveAttribute('href', 'https://exemplo.com/fonte')
    expect(fonte).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('Registrado por: Equipe do Observatório')).toBeInTheDocument()
  })

  it('mantém a retirada visível com marcador de texto e mudança de situação', () => {
    render(
      <ChangeLogList
        entries={[
          entry({
            tableName: 'news',
            oldValue: { status: 'publicada' },
            newValue: { status: 'retirada' },
            reason: 'Fonte indisponível',
          }),
        ]}
      />,
    )
    const item = screen.getByRole('listitem')
    expect(within(item).getByText('Retirada')).toBeInTheDocument()
    expect(item).toHaveTextContent('Situação: publicada → retirada')
    expect(item).toHaveTextContent('Fonte indisponível')
  })

  it('marca publicação', () => {
    render(
      <ChangeLogList
        entries={[entry({ oldValue: { status: 'rascunho' }, newValue: { status: 'publicada' } })]}
      />,
    )
    expect(screen.getByText('Publicação')).toBeInTheDocument()
  })

  it('mostra "Sem fonte vinculada." sem fonte ou com URL insegura', () => {
    render(
      <ChangeLogList
        entries={[entry({ id: 'a', sourceUrl: null }), entry({ id: 'b', sourceUrl: 'javascript:alert(1)' })]}
      />,
    )
    expect(screen.getAllByText('Sem fonte vinculada.')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Fonte' })).toBeNull()
  })

  it('mostra mensagem quando vazio', () => {
    render(<ChangeLogList entries={[]} />)
    expect(screen.getByText('Ainda não há atualizações registradas.')).toBeInTheDocument()
  })
})
