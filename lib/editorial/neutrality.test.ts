import { describe, expect, it } from 'vitest'
import { FORBIDDEN_PHRASES, findForbiddenPhrases } from './neutrality'

describe('neutrality', () => {
  it('lista as expressões proibidas', () => {
    expect([...FORBIDDEN_PHRASES]).toEqual(['melhor candidato', 'mais preparado', 'mais promissor'])
  })

  it('encontra expressões sem diferenciar maiúsculas', () => {
    expect(findForbiddenPhrases('Ele é o Melhor Candidato e o MAIS PREPARADO.')).toEqual([
      'melhor candidato',
      'mais preparado',
    ])
    expect(findForbiddenPhrases('mais promissor')).toEqual(['mais promissor'])
  })

  it('não acusa texto neutro', () => {
    expect(findForbiddenPhrases('Propostas organizadas por tema, em ordem alfabética.')).toEqual([])
    expect(findForbiddenPhrases('')).toEqual([])
  })
})
