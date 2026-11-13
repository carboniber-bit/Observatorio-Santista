import { describe, expect, it } from 'vitest'
import {
  CHANGE_AUTHOR_LABEL,
  getChangeLog,
  mapChangeLog,
  summarizeChange,
  type ChangeLogRow,
  type ChangeLogSource,
} from './changelog'

function row(over: Partial<ChangeLogRow> & { id: string; changed_at: string }): ChangeLogRow {
  return {
    table_name: 'proposals',
    row_id: 'r1',
    old_value: null,
    new_value: null,
    reason: 'Motivo de teste',
    source_id: null,
    ...over,
  }
}

describe('mapChangeLog', () => {
  it('ordena do mais recente ao mais antigo e desempata por id', () => {
    const entries = mapChangeLog(
      [
        row({ id: 'a', changed_at: '2026-11-01T10:00:00Z' }),
        row({ id: 'b', changed_at: '2026-11-03T10:00:00Z' }),
        row({ id: 'c', changed_at: '2026-11-03T10:00:00Z' }),
      ],
      new Map(),
    )
    expect(entries.map((e) => e.id)).toEqual(['c', 'b', 'a'])
  })

  it('mantém a retirada como entrada do histórico', () => {
    const entries = mapChangeLog(
      [
        row({
          id: 'x',
          changed_at: '2026-11-04T10:00:00Z',
          old_value: { status: 'publicada' },
          new_value: { status: 'retirada' },
          reason: 'Fonte retirada do ar',
        }),
      ],
      new Map(),
    )
    expect(entries).toHaveLength(1)
    expect(summarizeChange(entries[0]).kind).toBe('retirada')
    expect(entries[0].reason).toBe('Fonte retirada do ar')
  })

  it('usa sempre o autor constante, mesmo que a linha traga outro', () => {
    const withAuthor = { ...row({ id: 'a', changed_at: '2026-11-01T10:00:00Z' }), author: 'fulano@x.com' }
    const [entry] = mapChangeLog([withAuthor], new Map())
    expect(entry.author).toBe(CHANGE_AUTHOR_LABEL)
    expect(CHANGE_AUTHOR_LABEL).toBe('Equipe do Observatório')
  })

  it('resolve a url da fonte e deixa null quando a fonte não é visível', () => {
    const entries = mapChangeLog(
      [
        row({ id: 'a', changed_at: '2026-11-02T10:00:00Z', source_id: 's1' }),
        row({ id: 'b', changed_at: '2026-11-01T10:00:00Z', source_id: 's2' }),
        row({ id: 'c', changed_at: '2026-10-31T10:00:00Z', source_id: null }),
      ],
      new Map([['s1', 'https://exemplo.com/a']]),
    )
    expect(entries.map((e) => e.sourceUrl)).toEqual(['https://exemplo.com/a', null, null])
  })

  it('não quebra com valores nulos', () => {
    const [entry] = mapChangeLog(
      [row({ id: 'a', changed_at: '2026-11-01T10:00:00Z', reason: null, old_value: null, new_value: null })],
      new Map(),
    )
    expect(entry.reason).toBe('')
    expect(entry.oldValue).toBeNull()
    expect(entry.newValue).toBeNull()
  })
})

describe('getChangeLog', () => {
  const rows = [
    row({ id: 'a', changed_at: '2026-11-01T10:00:00Z', source_id: 's1' }),
    row({ id: 'b', changed_at: '2026-11-02T10:00:00Z', source_id: 's1' }),
  ]

  it('busca fontes distintas e entrega o histórico ordenado', async () => {
    let asked: string[] = []
    const source: ChangeLogSource = {
      fetchRows: async () => rows,
      fetchSourceUrls: async (ids) => {
        asked = ids
        return new Map([['s1', 'https://exemplo.com/s1']])
      },
    }
    const entries = await getChangeLog(100, source)
    expect(asked).toEqual(['s1'])
    expect(entries.map((e) => e.id)).toEqual(['b', 'a'])
    expect(entries[0].sourceUrl).toBe('https://exemplo.com/s1')
  })

  it('não falha o histórico quando a consulta de fontes falha', async () => {
    const source: ChangeLogSource = {
      fetchRows: async () => rows,
      fetchSourceUrls: async () => {
        throw new Error('boom')
      },
    }
    const entries = await getChangeLog(100, source)
    expect(entries).toHaveLength(2)
    expect(entries.every((e) => e.sourceUrl === null)).toBe(true)
  })

  it('propaga falha da consulta principal', async () => {
    const source: ChangeLogSource = {
      fetchRows: async () => {
        throw new Error('Falha ao carregar o histórico: x')
      },
      fetchSourceUrls: async () => new Map(),
    }
    await expect(getChangeLog(100, source)).rejects.toThrow('Falha ao carregar o histórico')
  })
})

describe('summarizeChange', () => {
  it('reconhece publicação com mudança de situação', () => {
    const s = summarizeChange({
      tableName: 'proposals',
      oldValue: { status: 'rascunho', description: 'a' },
      newValue: { status: 'publicada', description: 'a' },
    })
    expect(s.tableLabel).toBe('Proposta')
    expect(s.kind).toBe('publicacao')
    expect(s.statusChange).toEqual({ from: 'rascunho', to: 'publicada' })
    expect(s.changedFields).toEqual(['Situação'])
  })

  it('reconhece retirada', () => {
    const s = summarizeChange({
      tableName: 'news',
      oldValue: { status: 'publicada' },
      newValue: { status: 'retirada' },
    })
    expect(s.tableLabel).toBe('Notícia')
    expect(s.kind).toBe('retirada')
    expect(s.statusChange).toEqual({ from: 'publicada', to: 'retirada' })
  })

  it('trata edição simples listando os campos alterados', () => {
    const s = summarizeChange({
      tableName: 'candidates',
      oldValue: { bio: 'a', vice: 'x', ticket_name: 'T' },
      newValue: { bio: 'b', vice: 'y', ticket_name: 'T' },
    })
    expect(s.tableLabel).toBe('Candidato')
    expect(s.kind).toBe('edicao')
    expect(s.statusChange).toBeNull()
    expect(s.changedFields).toEqual(['Biografia', 'Vice'])
  })

  it('ignora updated_at e mantém chave desconhecida crua', () => {
    const s = summarizeChange({
      tableName: 'tabela_nova',
      oldValue: { updated_at: '1', campo_novo: 1 },
      newValue: { updated_at: '2', campo_novo: 2 },
    })
    expect(s.tableLabel).toBe('tabela_nova')
    expect(s.changedFields).toEqual(['campo_novo'])
  })

  it('não quebra com valores nulos ou não objeto', () => {
    expect(summarizeChange({ tableName: 'analyses', oldValue: null, newValue: null })).toEqual({
      tableLabel: 'Análise',
      changedFields: [],
      statusChange: null,
      kind: 'edicao',
    })
    const s = summarizeChange({ tableName: 'news', oldValue: 'texto', newValue: { status: 'publicada' } })
    expect(s.kind).toBe('publicacao')
    expect(s.statusChange).toEqual({ from: '', to: 'publicada' })
    expect(summarizeChange({ tableName: 'news', oldValue: [1], newValue: 3 }).changedFields).toEqual([])
  })
})
