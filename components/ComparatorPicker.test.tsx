import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Candidate } from '@/lib/editorial/queries'
import { ComparatorPicker } from './ComparatorPicker'

afterEach(cleanup)

const cands: Candidate[] = ['Ana', 'Beto', 'Caio', 'Duda'].map((name) => ({
  id: name, slug: name.toLowerCase(), name, ticket_name: null, vice: null, status: 'confirmada',
  bio: null, club_history: null, trajectory: null, photo_url: null, updated_at: '2026-01-01T00:00:00Z',
}))

describe('ComparatorPicker', () => {
  it('renderiza 4 checkboxes name="c", marcados conforme a seleção', () => {
    const { container } = render(<ComparatorPicker candidates={cands} selected={['ana', 'caio']} />)
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes).toHaveLength(4)
    boxes.forEach((b) => expect(b).toHaveAttribute('name', 'c'))
    expect(boxes.map((b) => b.checked)).toEqual([true, false, true, false])
    expect(screen.getByRole('group', { name: 'Candidatos a comparar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comparar' })).toHaveAttribute('type', 'submit')
    const form = container.querySelector('form')
    expect(form).toHaveAttribute('method', 'get')
    expect(form).toHaveAttribute('action', '/comparador')
  })
})
