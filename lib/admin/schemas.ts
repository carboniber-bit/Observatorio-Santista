import { z } from 'zod'

// Mensagens em pt-BR; nenhuma expõe detalhes internos.
export const MSG_REASON = 'Informe o motivo da alteração.'
export const MSG_PENDING_QUOTE =
  'Trecho ainda marcado como "citação a conferir": confira no original e remova a marca antes de publicar.'
export const MSG_NO_SOURCE = 'Proposta sem fonte com trecho comprobatório: não pode ser publicada.'
export const MSG_DENIED = 'Acesso negado.'
export const MSG_GENERIC = 'Não foi possível concluir a operação. Nada foi alterado.'

export function validReason(reason: unknown): reason is string {
  return typeof reason === 'string' && reason.trim().length >= 3
}

const uuid = z.string().uuid('Identificador inválido.')

// Texto opcional: vazio ou só espaços vira undefined.
function optional<T extends z.ZodTypeAny>(inner: T) {
  return z.preprocess((v) => {
    if (typeof v === 'string') {
      const t = v.trim()
      return t === '' ? undefined : t
    }
    return v === null ? undefined : v
  }, inner.optional())
}

export const httpUrl = z
  .string()
  .trim()
  .max(500, 'Link longo demais.')
  .refine((v) => /^https?:\/\//i.test(v), 'O link deve começar com http:// ou https://')
  .refine((v) => {
    try {
      new URL(v)
      return true
    } catch {
      return false
    }
  }, 'Link inválido.')

const slug = z
  .string()
  .trim()
  .min(1, 'Informe o identificador (slug).')
  .max(80, 'Identificador longo demais.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Identificador: use minúsculas, números e hífens.')

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).')

export const SOURCE_KINDS = [
  'documento_da_chapa',
  'entrevista_direta',
  'reportagem',
  'declaracao_como_presidente',
] as const
export const NEWS_CATEGORIES = [
  'eleicao',
  'candidatos',
  'propostas',
  'estatuto-e-regras',
  'clube',
  'plataforma',
] as const
export const BADGES = ['plataforma', 'terceiros', 'editorial'] as const
export const CANDIDACY_STATUSES = ['a_confirmar', 'confirmada', 'desistiu'] as const

export const proposalSchema = z
  .object({
    id: optional(uuid),
    candidateId: uuid,
    themeId: uuid,
    description: z
      .string()
      .trim()
      .min(1, 'Descreva a proposta.')
      .max(2000, 'A descrição pode ter no máximo 2000 caracteres.'),
    sourceKind: z.enum(SOURCE_KINDS, { message: 'Tipo de fonte inválido.' }),
    referenceYear: z.preprocess(
      (v) => (v === '' || v === null ? undefined : typeof v === 'string' ? Number(v) : v),
      z.number().int().min(1900, 'Ano inválido.').max(2100, 'Ano inválido.').optional(),
    ),
  })
  .strict()
export type ProposalInput = z.input<typeof proposalSchema> & { reason: string }

export const sourceSchema = z
  .object({
    url: httpUrl,
    outlet: optional(z.string().max(200)),
    publishedOn: optional(dateOnly),
    consultedOn: optional(dateOnly),
    kind: optional(z.string().max(100)),
    excerpt: optional(z.string().max(4000, 'Trecho longo demais.')),
  })
  .strict()
export type SourceInput = z.input<typeof sourceSchema>

export const newsSchema = z
  .object({
    id: optional(uuid),
    slug: optional(slug),
    title: z.string().trim().min(1, 'Informe o título.').max(200),
    body: z.string().trim().min(1, 'Informe o texto.').max(20000),
    category: z.enum(NEWS_CATEGORIES, { message: 'Categoria inválida.' }),
    badge: z.enum(BADGES, { message: 'Selo inválido.' }),
    sourceUrl: optional(httpUrl),
  })
  .strict()
export type NewsInput = z.input<typeof newsSchema> & { reason: string }

export const analysisSchema = z
  .object({
    id: optional(uuid),
    slug: optional(slug),
    title: z.string().trim().min(1, 'Informe o título.').max(200),
    facts: z.string().trim().min(1, 'Preencha o bloco de fatos.').max(20000),
    candidateStatements: z.string().trim().min(1, 'Preencha o bloco de declarações.').max(20000),
    editorialInterpretation: z
      .string()
      .trim()
      .min(1, 'Preencha o bloco de interpretação editorial.')
      .max(20000),
  })
  .strict()
export type AnalysisInput = z.input<typeof analysisSchema> & { reason: string }

export const candidateSchema = z
  .object({
    id: uuid,
    name: z.string().trim().min(1, 'Informe o nome.').max(200),
    ticketName: optional(z.string().max(200)),
    vice: optional(z.string().max(200)),
    status: z.enum(CANDIDACY_STATUSES, { message: 'Situação inválida.' }),
    bio: optional(z.string().max(10000)),
    clubHistory: optional(z.string().max(10000)),
    trajectory: optional(z.string().max(10000)),
    photoUrl: optional(httpUrl),
  })
  .strict()
export type CandidateInput = z.input<typeof candidateSchema> & { reason: string }

export const idSchema = uuid
