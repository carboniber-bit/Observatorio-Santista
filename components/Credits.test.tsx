import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CreditsLine, CreditsSection } from './Credits'

afterEach(cleanup)

describe('Credits', () => {
  it('linha de crédito aponta para o site da Carboni Digital Business', () => {
    render(<CreditsLine />)
    const a = screen.getByRole('link', { name: /Carboni Digital Business/ })
    expect(a).toHaveAttribute('href', 'https://carboni-digital-bussiness.lovable.app/')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
    expect(a).toHaveAttribute('target', '_blank')
  })
  it('seção Créditos tem título e link', () => {
    render(<CreditsSection />)
    expect(screen.getByRole('heading', { name: 'Créditos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Carboni Digital Business/ })).toBeInTheDocument()
  })
})
