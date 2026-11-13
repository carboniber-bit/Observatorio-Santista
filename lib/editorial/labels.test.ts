import { describe, it, expect } from 'vitest'
import {
  CANDIDACY_STATUS_LABELS,
  PROFILE_FIELD_LABELS,
  SOURCE_KIND_LABELS,
  candidacyStatusLabel,
  formatDatePtBr,
  initials,
  isSafeHttpUrl,
  sourceKindLabel,
} from './labels'

describe('labels', () => {
  it('mantém a ordem e os textos dos campos do perfil', () => {
    expect([...PROFILE_FIELD_LABELS]).toEqual([
      'Nome',
      'Situação da candidatura',
      'Biografia',
      'Histórico no Santos',
      'Trajetória administrativa',
      'Propostas por tema',
      'Entrevistas e declarações',
      'Fontes e referências',
      'Data da última atualização',
    ])
  })

  it('rotula tipos de fonte e situações', () => {
    expect(SOURCE_KIND_LABELS.documento_da_chapa).toBe('Documento da chapa')
    expect(SOURCE_KIND_LABELS.entrevista_direta).toBe('Entrevista direta')
    expect(SOURCE_KIND_LABELS.reportagem).toBe('Reportagem')
    expect(SOURCE_KIND_LABELS.declaracao_como_presidente).toBe(
      'Declaração como presidente em exercício',
    )
    expect(CANDIDACY_STATUS_LABELS.a_confirmar).toBe('Candidatura a confirmar')
    expect(CANDIDACY_STATUS_LABELS.confirmada).toBe('Candidatura confirmada')
    expect(CANDIDACY_STATUS_LABELS.desistiu).toBe('Desistiu da candidatura')
    expect(candidacyStatusLabel('outro')).toBe('outro')
    expect(sourceKindLabel('plano')).toBe('plano')
    expect(sourceKindLabel('toString')).toBe('toString')
  })

  it('calcula iniciais', () => {
    expect(initials('Marcelo Teixeira')).toBe('MT')
    expect(initials('José Renato Quaresma')).toBe('JQ')
    expect(initials('Álvaro')).toBe('Á')
    expect(initials('  ')).toBe('')
  })

  it('formata datas em pt-BR sem deslocar o dia', () => {
    expect(formatDatePtBr('2026-11-08')).toBe('08/11/2026')
    expect(formatDatePtBr('2026-11-12T02:30:00Z')).toBe('11/11/2026')
    expect(formatDatePtBr(new Date('2026-11-12T15:00:00Z'))).toBe('12/11/2026')
  })

  it('só aceita http(s)', () => {
    expect(isSafeHttpUrl('https://a.com')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
  })
})
