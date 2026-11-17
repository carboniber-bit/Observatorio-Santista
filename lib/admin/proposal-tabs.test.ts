import { describe, expect, it } from 'vitest'
import { DEFAULT_PROPOSAL_TAB, parseProposalTab, tabOfStatus } from './proposal-tabs'

describe('proposal-tabs', () => {
  it('separa propostas por situação', () => {
    expect(tabOfStatus('em_revisao')).toBe('a-publicar')
    expect(tabOfStatus('publicada')).toBe('publicadas')
    expect(tabOfStatus('corrigida')).toBe('publicadas')
    expect(tabOfStatus('retirada')).toBe('retiradas')
  })
  it('situação desconhecida não some: vai para "A publicar"', () => {
    expect(tabOfStatus('xyz')).toBe('a-publicar')
  })
  it('aba inválida ou ausente usa a padrão', () => {
    expect(DEFAULT_PROPOSAL_TAB).toBe('a-publicar')
    expect(parseProposalTab(undefined)).toBe('a-publicar')
    expect(parseProposalTab('lixo')).toBe('a-publicar')
    expect(parseProposalTab('publicadas')).toBe('publicadas')
  })
})
