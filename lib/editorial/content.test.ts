import { describe, expect, it } from 'vitest'
import { parseCategory } from './content'

describe('parseCategory', () => {
  it('aceita categorias conhecidas', () => {
    expect(parseCategory('clube')).toBe('clube')
    expect(parseCategory('estatuto-e-regras')).toBe('estatuto-e-regras')
    expect(parseCategory(['propostas', 'clube'])).toBe('propostas')
  })
  it('devolve null para ausente ou desconhecida', () => {
    expect(parseCategory(undefined)).toBeNull()
    expect(parseCategory('xyz')).toBeNull()
    expect(parseCategory('toString')).toBeNull()
    expect(parseCategory([])).toBeNull()
  })
})
