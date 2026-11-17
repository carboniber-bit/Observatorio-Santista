import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ContactLine, ContactSection } from './Contact'

afterEach(cleanup)

describe('Contact', () => {
  it('linha de contato tem mailto do e-mail do projeto', () => {
    render(<ContactLine />)
    expect(screen.getByRole('link', { name: 'observatoriosantista2026@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:observatoriosantista2026@gmail.com',
    )
  })
  it('seção Contato tem título, e-mail e link para /corrigir', () => {
    render(<ContactSection />)
    expect(screen.getByRole('heading', { name: 'Contato' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'observatoriosantista2026@gmail.com' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solicitar correção' })).toHaveAttribute('href', '/corrigir')
  })
})
