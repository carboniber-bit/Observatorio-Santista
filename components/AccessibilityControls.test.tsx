import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AccessibilityControls } from './AccessibilityControls'

describe('AccessibilityControls', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-text-size')
    document.documentElement.removeAttribute('data-contrast')
  })
  afterEach(cleanup)

  it('aumenta e diminui o texto e persiste a escolha', () => {
    render(<AccessibilityControls />)
    const menos = screen.getByRole('button', { name: 'Diminuir tamanho do texto' })
    expect((menos as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar tamanho do texto' }))
    expect(document.documentElement.getAttribute('data-text-size')).toBe('lg')
    expect(window.localStorage.getItem('os26_size')).toBe('lg')
    fireEvent.click(menos)
    expect(document.documentElement.hasAttribute('data-text-size')).toBe(false)
  })

  it('alterna o tema: automático → claro → escuro → automático', () => {
    render(<AccessibilityControls />)
    const btn = () => screen.getByRole('button', { name: /^Tema:/ })
    fireEvent.click(btn())
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    fireEvent.click(btn())
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    fireEvent.click(btn())
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('liga o alto contraste', () => {
    render(<AccessibilityControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Alto contraste' }))
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high')
  })
})
