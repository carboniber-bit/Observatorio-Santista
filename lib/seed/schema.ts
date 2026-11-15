import { z } from 'zod'

// Esquema e validação do conteúdo inicial (content/seed/*.json).
// Imports relativos com extensão .ts: o módulo roda sob Node 22 (strip-types) e no Next.

export const CANDIDATE_SLUGS = [
  'marcelo-teixeira',
  'mauricio-maruca',
  'jose-renato-quaresma',
  'ivan-luduvice',
] as const

// Mesmos slugs de supabase/seed.sql (o teste compara os dois).
export const THEME_SLUGS = [
  'futebol',
  'financas',
  'governanca-transparencia',
  'estadio-patrimonio',
  'base-formacao',
  'futebol-feminino',
  'receitas-marketing',
  'socios-torcida',
  'estatuto-processo-eleitoral',
] as const

// Mesmos valores do check de proposals.source_kind (0001_core.sql) e de SOURCE_KIND_LABELS.
export const SOURCE_KINDS = [
  'documento_da_chapa',
  'entrevista_direta',
  'reportagem',
  'declaracao_como_presidente',
] as const

export const RESEARCH_CONSULTED_ON = '2026-11-08'
export const MAX_QUOTE_WORDS = 14
export const PENDING_NOTE_SUFFIX = ' (citação a conferir no original)'
export const FORBIDDEN_PHRASES = ['melhor candidato', 'mais preparado', 'mais promissor'] as const

export type SeedSource = {
  url: string
  outlet: string
  publishedOn: string
  consultedOn: string
  kind: (typeof SOURCE_KINDS)[number]
  excerpt: string
}

export type SeedEntry = {
  candidateSlug: (typeof CANDIDATE_SLUGS)[number]
  themeSlug: (typeof THEME_SLUGS)[number]
  description: string
  sourceKind: (typeof SOURCE_KINDS)[number]
  referenceYear: number | null
  sources: SeedSource[]
}

export type SeedFile = { candidateSlug: (typeof CANDIDATE_SLUGS)[number]; entries: SeedEntry[] }

export type ValidateOptions = { requireConsultedOn?: string }

function isCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

const QUOTE_CHARS = /["“”«»]/g

// Aspas (retas, curvas e angulares) formam uma única classe de delimitadores, pareados em
// sequência: 1ª abre, 2ª fecha. Devolve o maior trecho entre aspas em palavras, ou -1 se a
// contagem de aspas for ímpar (não pareada).
export function longestQuotedRun(text: string): number {
  const parts = text.split(QUOTE_CHARS)
  if (parts.length % 2 === 0) return -1
  let max = 0
  for (let i = 1; i < parts.length; i += 2) {
    const words = parts[i].split(/\s+/).filter(Boolean).length
    if (words > max) max = words
  }
  return max
}

function normalizeText(v: string): string {
  return v.replace(/[\s\u00a0]+/g, ' ').toLocaleLowerCase('pt-BR')
}

const FORBIDDEN_PATTERNS = [
  /(?<!\p{L})mais preparad[oa]s?(?!\p{L})/u,
  /(?<!\p{L})melhor(es)? candidat[oa]s?(?!\p{L})/u,
  /(?<!\p{L})mais promissor(es|a|as)?(?!\p{L})/u,
]

const nonBlank = z.string().refine((v) => v.trim().length > 0, 'não pode ser vazio')
const dateField = z.string().refine(isCalendarDate, 'data inválida (use aaaa-mm-dd)')

const quoteGuard = (v: string) => {
  const n = longestQuotedRun(v)
  return n >= 0 && n <= MAX_QUOTE_WORDS
}
const quoteMessage = `aspas não pareadas ou trecho entre aspas com mais de ${MAX_QUOTE_WORDS} palavras (parafraseie)`
const noForbidden = (v: string) => {
  const t = normalizeText(v)
  return !FORBIDDEN_PATTERNS.some((r) => r.test(t))
}
const forbiddenMessage = `expressão avaliativa proibida (${FORBIDDEN_PHRASES.join(', ')})`

export function makeSeedEntrySchema(requireConsultedOn: string = RESEARCH_CONSULTED_ON) {
  const source = z
    .object({
      url: nonBlank.refine((v) => /^https?:\/\/\S+$/.test(v.trim()), 'url deve começar com http:// ou https://'),
      outlet: nonBlank,
      publishedOn: dateField,
      consultedOn: dateField.refine(
        (v) => v === requireConsultedOn,
        `consultedOn deve ser ${requireConsultedOn}`,
      ),
      kind: z.enum(SOURCE_KINDS),
      excerpt: nonBlank
        .refine(quoteGuard, quoteMessage)
        .refine(noForbidden, forbiddenMessage),
    })
    .strict()
    .refine(
      (v) => !isCalendarDate(v.publishedOn) || !isCalendarDate(v.consultedOn) || v.publishedOn <= v.consultedOn,
      { path: ['publishedOn'], message: 'publishedOn não pode ser posterior a consultedOn' },
    )

  return z
    .object({
      candidateSlug: z.enum(CANDIDATE_SLUGS),
      themeSlug: z.enum(THEME_SLUGS),
      description: nonBlank
        .refine((v) => v.length <= 2000, 'description deve ter no máximo 2000 caracteres')
        .refine(quoteGuard, quoteMessage)
        .refine(noForbidden, forbiddenMessage),
      sourceKind: z.enum(SOURCE_KINDS),
      referenceYear: z.number().int().min(2000).max(2026).nullable(),
      sources: z.array(source).min(1, 'ao menos uma fonte é obrigatória'),
    })
    .strict()
}

export function makeSeedFileSchema(requireConsultedOn: string = RESEARCH_CONSULTED_ON) {
  return z
    .object({
      candidateSlug: z.enum(CANDIDATE_SLUGS),
      entries: z.array(makeSeedEntrySchema(requireConsultedOn)),
    })
    .strict()
    .superRefine((file, ctx) => {
      file.entries.forEach((entry, i) => {
        if (entry.candidateSlug !== file.candidateSlug) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['entries', i, 'candidateSlug'],
            message: `candidateSlug da entrada (${entry.candidateSlug}) difere do arquivo (${file.candidateSlug})`,
          })
        }
      })
    })
}

export class SeedValidationError extends Error {
  readonly issues: string[]
  constructor(issues: string[]) {
    super(`Conteúdo inicial inválido:\n- ${issues.join('\n- ')}`)
    this.name = 'SeedValidationError'
    this.issues = issues
  }
}

export function formatZodIssues(error: z.ZodError, label: string): string[] {
  return error.issues.map((i) => `${label}${i.path.length ? ` [${i.path.join('.')}]` : ''}: ${i.message}`)
}

export function validateSeedFile(data: unknown, label: string, opts: ValidateOptions = {}): SeedFile {
  const result = makeSeedFileSchema(opts.requireConsultedOn ?? RESEARCH_CONSULTED_ON).safeParse(data)
  if (!result.success) throw new SeedValidationError(formatZodIssues(result.error, label))
  return result.data as SeedFile
}

export function validateEntries(data: unknown, opts: ValidateOptions = {}): SeedEntry[] {
  const result = z
    .array(makeSeedEntrySchema(opts.requireConsultedOn ?? RESEARCH_CONSULTED_ON))
    .safeParse(data)
  if (!result.success) throw new SeedValidationError(formatZodIssues(result.error, 'entradas'))
  const entries = result.data as SeedEntry[]
  assertNoDuplicates(entries)
  return entries
}

export function assertNoDuplicates(entries: SeedEntry[]): void {
  const seen = new Set<string>()
  const issues: string[] = []
  for (const e of entries) {
    const key = JSON.stringify([e.candidateSlug, e.themeSlug, e.description.trim()])
    if (seen.has(key)) issues.push(`entrada duplicada: ${e.candidateSlug} / ${e.themeSlug}`)
    seen.add(key)
  }
  if (issues.length) throw new SeedValidationError(issues)
}
