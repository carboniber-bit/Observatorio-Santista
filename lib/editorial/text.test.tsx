import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EditorialText } from './text'

describe('EditorialText', () => {
  it('renderiza <script> como texto literal, sem elemento script', () => {
    const value = '<script>alert(1)</script>'
    const { container } = render(<EditorialText value={value} />)
    expect(container.textContent).toBe(value)
    expect(container.querySelector('script')).toBeNull()
  })

  it('renderiza <img onerror> como texto, sem elemento img', () => {
    const value = '<img src=x onerror=alert(1)>'
    const { container } = render(<EditorialText value={value} />)
    expect(container.textContent).toBe(value)
    expect(container.querySelector('img')).toBeNull()
  })

  it('preserva quebras de linha no conteúdo de texto', () => {
    const value = 'linha 1\nlinha 2'
    const { container } = render(<EditorialText value={value} />)
    expect(container.textContent).toBe(value)
    expect(container.querySelector('span')?.className).toBe('whitespace-pre-line')
  })
})
