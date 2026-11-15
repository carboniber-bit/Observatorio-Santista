// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hasPendingQuoteMark, isVerifiedExcerpt, PENDING_QUOTE_MARK } from './pending-quote'
import { PENDING_NOTE_SUFFIX } from '../seed/schema'

describe('marca de citação a conferir', () => {
  it('o sufixo do importador usa a mesma marca', () => {
    expect(PENDING_NOTE_SUFFIX).toBe(` ${PENDING_QUOTE_MARK}`)
  })
  it('detecta a marca sem diferenciar maiúsculas', () => {
    expect(hasPendingQuoteMark('Texto (citação a conferir no original)')).toBe(true)
    expect(hasPendingQuoteMark('Texto (CITAÇÃO A CONFERIR NO ORIGINAL)')).toBe(true)
    expect(hasPendingQuoteMark('Texto conferido')).toBe(false)
    expect(hasPendingQuoteMark(null)).toBe(false)
  })
  it('só trecho não vazio e sem a marca é comprobatório', () => {
    expect(isVerifiedExcerpt('trecho')).toBe(true)
    expect(isVerifiedExcerpt('   ')).toBe(false)
    expect(isVerifiedExcerpt(null)).toBe(false)
    expect(isVerifiedExcerpt('x (citação a conferir no original)')).toBe(false)
  })
})
