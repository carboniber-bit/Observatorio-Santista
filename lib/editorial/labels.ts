// Rótulos e formatadores puros, iguais para todos os candidatos.

export const PROFILE_FIELD_LABELS = [
  'Nome',
  'Situação da candidatura',
  'Biografia',
  'Histórico no Santos',
  'Trajetória administrativa',
  'Propostas por tema',
  'Entrevistas e declarações',
  'Fontes e referências',
  'Data da última atualização',
] as const

export const SOURCE_KIND_LABELS: Record<string, string> = {
  documento_da_chapa: 'Documento da chapa',
  entrevista_direta: 'Entrevista direta',
  reportagem: 'Reportagem',
  declaracao_como_presidente: 'Declaração como presidente em exercício',
}

export const CANDIDACY_STATUS_LABELS: Record<string, string> = {
  a_confirmar: 'Candidatura a confirmar',
  confirmada: 'Candidatura confirmada',
  desistiu: 'Desistiu da candidatura',
}

function lookup(table: Record<string, string>, key: string): string {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : key
}

export function sourceKindLabel(kind: string): string {
  return lookup(SOURCE_KIND_LABELS, kind)
}

export function candidacyStatusLabel(status: string): string {
  return lookup(CANDIDACY_STATUS_LABELS, status)
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const first = Array.from(words[0])[0] ?? ''
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? '') : ''
  return (first + last).toLocaleUpperCase('pt-BR')
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

const SP_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatDatePtBr(value: string | Date): string {
  let date: Date
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value)
    // Data de calendário: meio-dia UTC nunca cruza o dia em America/Sao_Paulo.
    date = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : new Date(value)
  } else {
    date = value
  }
  if (Number.isNaN(date.getTime())) return ''
  const parts = SP_FORMAT.formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')}`
}

export function isSafeHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}
