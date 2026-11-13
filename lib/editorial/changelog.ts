import { createAnonClient } from '@/lib/supabase/anon'
import type { Tables } from '@/lib/db/types'

// O autor real nunca é exposto: o anon nem tem permissão de ler a coluna `author`.
export const CHANGE_AUTHOR_LABEL = 'Equipe do Observatório'

export type ChangeLogEntry = {
  id: string
  changedAt: string
  tableName: string
  reason: string
  sourceUrl: string | null
  author: string
  oldValue: unknown
  newValue: unknown
}

// Colunas explícitas (nunca `*` nem `author`).
export type ChangeLogRow = Pick<
  Tables<'change_log'>,
  'id' | 'table_name' | 'row_id' | 'old_value' | 'new_value' | 'changed_at' | 'reason' | 'source_id'
>

export type ChangeLogSource = {
  fetchRows(limit: number): Promise<ChangeLogRow[]>
  // Mapa id da fonte -> url. Fontes não visíveis simplesmente não aparecem.
  fetchSourceUrls(ids: string[]): Promise<Map<string, string>>
}

const ROW_COLUMNS = 'id, table_name, row_id, old_value, new_value, changed_at, reason, source_id'

const defaultSource: ChangeLogSource = {
  async fetchRows(limit) {
    const supabase = createAnonClient()
    const { data, error } = await supabase
      .from('change_log')
      .select(ROW_COLUMNS)
      .order('changed_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit)
    if (error) throw new Error(`Falha ao carregar o histórico: ${error.message}`)
    return (data ?? []) as ChangeLogRow[]
  },
  async fetchSourceUrls(ids) {
    const supabase = createAnonClient()
    const { data, error } = await supabase.from('sources').select('id, url').in('id', ids)
    if (error) throw new Error(`Falha ao carregar fontes: ${error.message}`)
    const map = new Map<string, string>()
    for (const row of (data ?? []) as { id: string; url: string }[]) map.set(row.id, row.url)
    return map
  },
}

// Função pura: mais recente primeiro; empate de data desempata por id decrescente.
export function mapChangeLog(
  rows: ChangeLogRow[],
  sourcesById: Map<string, string>,
): ChangeLogEntry[] {
  return rows
    .map(
      (row): ChangeLogEntry => ({
        id: row.id,
        changedAt: row.changed_at,
        tableName: row.table_name,
        reason: row.reason ?? '',
        sourceUrl: (row.source_id ? sourcesById.get(row.source_id) : undefined) ?? null,
        author: CHANGE_AUTHOR_LABEL,
        oldValue: row.old_value ?? null,
        newValue: row.new_value ?? null,
      }),
    )
    .sort((a, b) => {
      const ta = Date.parse(a.changedAt)
      const tb = Date.parse(b.changedAt)
      const byDate = (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
      if (byDate !== 0) return byDate
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
    })
}

export async function getChangeLog(
  limit = 100,
  source: ChangeLogSource = defaultSource,
): Promise<ChangeLogEntry[]> {
  const rows = await source.fetchRows(limit)
  const ids = Array.from(
    new Set(rows.map((r) => r.source_id).filter((id): id is string => Boolean(id))),
  )
  let sourcesById = new Map<string, string>()
  if (ids.length > 0) {
    try {
      sourcesById = await source.fetchSourceUrls(ids)
    } catch {
      // Sem fontes visíveis o histórico continua válido, apenas sem links.
      sourcesById = new Map()
    }
  }
  return mapChangeLog(rows, sourcesById)
}

export type ChangeSummary = {
  tableLabel: string
  changedFields: string[]
  statusChange: { from: string; to: string } | null
  kind: 'retirada' | 'publicacao' | 'edicao'
}

const TABLE_LABELS: Record<string, string> = {
  proposals: 'Proposta',
  news: 'Notícia',
  analyses: 'Análise',
  candidates: 'Candidato',
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Situação',
  description: 'Descrição',
  title: 'Título',
  body: 'Texto',
  bio: 'Biografia',
  club_history: 'Histórico no Santos',
  trajectory: 'Trajetória administrativa',
  ticket_name: 'Chapa',
  vice: 'Vice',
  photo_url: 'Foto',
  reference_year: 'Ano de referência',
  source_kind: 'Tipo de fonte',
  facts: 'Fatos',
  candidate_statements: 'Declarações dos candidatos',
  editorial_interpretation: 'Interpretação editorial',
}

function lookup(table: Record<string, string>, key: string): string {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function statusOf(record: Record<string, unknown>): string {
  const s = record.status
  return typeof s === 'string' ? s : ''
}

export function summarizeChange(
  entry: Pick<ChangeLogEntry, 'tableName' | 'oldValue' | 'newValue'>,
): ChangeSummary {
  const oldV = asRecord(entry.oldValue)
  const newV = asRecord(entry.newValue)
  const keys = Array.from(new Set([...Object.keys(oldV), ...Object.keys(newV)]))
  const changedKeys = keys.filter((k) => k !== 'updated_at' && !same(oldV[k], newV[k]))

  const from = statusOf(oldV)
  const to = statusOf(newV)
  const statusChanged = changedKeys.includes('status')

  let kind: ChangeSummary['kind'] = 'edicao'
  if (to === 'retirada') kind = 'retirada'
  else if ((to === 'publicada' || to === 'corrigida') && from !== to) kind = 'publicacao'

  return {
    tableLabel: lookup(TABLE_LABELS, entry.tableName),
    changedFields: changedKeys.map((k) => lookup(FIELD_LABELS, k)),
    statusChange: statusChanged ? { from, to } : null,
    kind,
  }
}
