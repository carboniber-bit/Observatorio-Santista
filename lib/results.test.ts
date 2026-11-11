import { describe, it, expect } from 'vitest'
import { summarize, parseFilter } from './results'

describe('summarize', () => {
  it('com zero votos: total 0, pct 0 em todas as linhas e sem NaN', () => {
    const s = summarize(
      [
        { candidate_id: 'a', votes: 0 },
        { candidate_id: 'b', votes: 0 },
        { candidate_id: null, votes: 0 },
      ],
      0,
      null,
    )
    expect(s.total).toBe(0)
    expect(s.byCandidate).toHaveLength(3)
    for (const r of s.byCandidate) {
      expect(r.pct).toBe(0)
      expect(Number.isNaN(r.pct)).toBe(false)
    }
    expect(s.lastUpdated).toBeNull()
  })

  it('arredonda o percentual para uma casa decimal', () => {
    const s = summarize(
      [
        { candidate_id: 'a', votes: 1 },
        { candidate_id: 'b', votes: 2 },
      ],
      0,
      null,
    )
    expect(s.byCandidate.map((r) => r.pct)).toEqual([66.7, 33.3])
  })

  it('mantém Branco/Indeciso (null) por último mesmo com mais votos', () => {
    const s = summarize(
      [
        { candidate_id: null, votes: 10 },
        { candidate_id: 'a', votes: 1 },
        { candidate_id: 'b', votes: 3 },
      ],
      0,
      null,
    )
    expect(s.byCandidate.map((r) => r.candidateId)).toEqual(['b', 'a', null])
  })

  it('desempata por candidateId', () => {
    const s = summarize(
      [
        { candidate_id: 'b', votes: 2 },
        { candidate_id: 'a', votes: 2 },
      ],
      0,
      null,
    )
    expect(s.byCandidate.map((r) => r.candidateId)).toEqual(['a', 'b'])
  })

  it('converte bigint recebido como string', () => {
    const s = summarize(
      [
        { candidate_id: 'a', votes: '3' },
        { candidate_id: null, votes: '1' },
      ],
      '7',
      '2026-11-20T12:00:00Z',
    )
    expect(s.total).toBe(4)
    expect(s.byCandidate[0]).toEqual({ candidateId: 'a', votes: 3, pct: 75 })
    expect(s.discarded).toBe(7)
    expect(s.lastUpdated).toBe('2026-11-20T12:00:00Z')
  })
})

describe('parseFilter', () => {
  it('mapeia todos, ausente e desconhecido para all', () => {
    expect(parseFilter('todos')).toBe('all')
    expect(parseFilter(undefined)).toBe('all')
    expect(parseFilter('qualquer')).toBe('all')
    expect(parseFilter('')).toBe('all')
  })
  it('mapeia socio e nao_socio', () => {
    expect(parseFilter('socio')).toBe('socio')
    expect(parseFilter('nao_socio')).toBe('nao_socio')
  })
  it('usa o primeiro valor quando vier lista', () => {
    expect(parseFilter(['socio', 'nao_socio'])).toBe('socio')
    expect(parseFilter([])).toBe('all')
  })
})
