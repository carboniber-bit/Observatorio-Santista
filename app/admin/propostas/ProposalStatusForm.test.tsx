import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProposalStatusForm } from './ProposalStatusForm'

function makeActions() {
  const calls: { op: string; data: Record<string, string> }[] = []
  const rec = (op: string) => async (fd: FormData) => {
    const data: Record<string, string> = {}
    fd.forEach((v, k) => {
      if (typeof v === 'string') data[k] = v
    })
    calls.push({ op, data })
  }
  return { calls, publishAction: rec('publish'), correctAction: rec('correct'), retractAction: rec('retract') }
}

const SOURCES = [
  { id: '11111111-1111-4111-8111-111111111111', url: 'https://exemplo.invalid/a' },
  { id: '22222222-2222-4222-8222-222222222222', url: 'https://exemplo.invalid/b' },
]
const PID = '33333333-3333-4333-8333-333333333333'

function setup(sources = SOURCES) {
  const a = makeActions()
  const view = render(
    <ProposalStatusForm
      proposalId={PID}
      sources={sources}
      publishAction={a.publishAction}
      correctAction={a.correctAction}
      retractAction={a.retractAction}
    />,
  )
  return { ...a, ...view }
}

describe('ProposalStatusForm', () => {
  it('tem um único formulário, um motivo, uma fonte e três botões', () => {
    const { container } = setup()
    expect(container.querySelectorAll('form')).toHaveLength(1)
    expect(screen.getAllByLabelText(/Motivo da alteração/)).toHaveLength(1)
    expect(screen.getAllByLabelText(/Fonte que fundamenta/)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Marcar como corrigida' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retirar' })).toBeTruthy()
    expect(container.querySelectorAll('input[name="id"]')).toHaveLength(1)
    expect(container.querySelectorAll('input[name="reason"]')).toHaveLength(1)
  })

  it('sem fontes não mostra o campo de fonte', () => {
    setup([])
    expect(screen.queryByLabelText(/Fonte que fundamenta/)).toBeNull()
  })

  it.each([
    ['Publicar', 'publish'],
    ['Marcar como corrigida', 'correct'],
    ['Retirar', 'retract'],
  ])('o botão "%s" chama só a ação %s, com id, motivo e fonte compartilhados', async (label, op) => {
    const { calls } = setup()
    fireEvent.change(screen.getByLabelText(/Motivo da alteração/), { target: { value: 'Conferido na fonte original' } })
    fireEvent.change(screen.getByLabelText(/Fonte que fundamenta/), { target: { value: SOURCES[1].id } })
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].op).toBe(op)
    expect(calls[0].data.id).toBe(PID)
    expect(calls[0].data.reason).toBe('Conferido na fonte original')
    expect(calls[0].data.sourceId).toBe(SOURCES[1].id)
  })
})
