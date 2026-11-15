import { z } from 'zod'
import {
  MSG_DENIED,
  MSG_GENERIC,
  MSG_NO_SOURCE,
  MSG_PENDING_QUOTE,
  MSG_REASON,
  analysisSchema,
  candidateSchema,
  idSchema,
  newsSchema,
  proposalSchema,
  sourceSchema,
  validReason,
  type AnalysisInput,
  type CandidateInput,
  type NewsInput,
  type ProposalInput,
  type SourceInput,
} from './schemas'

// Lógica das ações do painel, sem Next nem Supabase: tudo entra por injeção.
// É isto que os testes exercitam; lib/admin/actions.ts só liga as dependências reais.

export type Row = Record<string, unknown>
export type InsertTable = 'proposals' | 'sources' | 'news' | 'analyses'
export type UpdateRpc =
  | 'admin_update_proposal'
  | 'admin_update_news'
  | 'admin_update_candidate'
  | 'admin_update_analysis'
  | 'admin_update_source'

export interface AdminDb {
  insert(table: InsertTable, row: Row): Promise<{ id: string }>
  update(
    fn: UpdateRpc,
    args: { id: string; patch: Row; reason: string; sourceId?: string },
  ): Promise<void>
  // Fontes com trecho comprobatório: não vazio e sem a marca "(citação a conferir no original)".
  countSourcesWithExcerpt(proposalId: string): Promise<number>
  // Fontes cujo trecho ainda tem a marca de citação a conferir.
  countPendingQuoteSources(proposalId: string): Promise<number>
  // Devolve quantas linhas foram atualizadas (0 = pedido inexistente ou sem permissão).
  markCorrectionHandled(id: string, handledAtIso: string): Promise<number>
  // published_at atual da notícia/análise (null se ainda não publicada).
  currentPublishedAt(table: 'news' | 'analyses', id: string): Promise<string | null>
}

export type AdminResult = { ok: true; id?: string } | { ok: false; error: string }

export type AdminCoreDeps = {
  db: AdminDb
  // Deve lançar/redirecionar quando a sessão não for admin com aal2.
  requireAdmin: () => Promise<unknown>
  now?: () => Date
}

const fail = (error: string): AdminResult => ({ ok: false, error })

// Traduz erros do banco para texto amigável, sem vazar SQL, nomes de tabela ou stack.
export function friendlyError(err: unknown): string {
  const text = String((err as { message?: unknown })?.message ?? err ?? '')
  const code = String((err as { code?: unknown })?.code ?? '')
  if (/publicada sem ao menos uma fonte/i.test(text)) return MSG_NO_SOURCE
  if (/citacao a conferir/i.test(text)) return MSG_PENDING_QUOTE
  if (/ficar sem trecho|nao pode mudar de proposta|manter ao menos uma fonte/i.test(text)) {
    return 'Mantenha o trecho comprobatório da fonte: uma fonte de proposta publicada não pode ficar sem trecho.'
  }
  if (/exige motivo/i.test(text)) return MSG_REASON
  if (code === '42501' || /acesso negado/i.test(text)) return MSG_DENIED
  if (code === '23505' || /duplicate key/i.test(text)) {
    return 'Já existe um registro com este identificador (slug).'
  }
  return MSG_GENERIC
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Dados inválidos.'
}

function nullable<T>(v: T | undefined): T | null {
  return v === undefined ? null : v
}

export function makeAdminCore(deps: AdminCoreDeps) {
  const { db, requireAdmin } = deps
  const now = deps.now ?? (() => new Date())

  // Ordem fixa: 1) requireAdmin (lança se não for admin) 2) motivo 3) corpo da ação.
  async function guarded(
    reason: unknown,
    body: (reason: string) => Promise<AdminResult>,
  ): Promise<AdminResult> {
    await requireAdmin()
    if (!validReason(reason)) return fail(MSG_REASON)
    try {
      return await body(reason.trim())
    } catch (err) {
      return fail(friendlyError(err))
    }
  }

  function parse<S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> | AdminResult {
    const r = schema.safeParse(value)
    return r.success ? r.data : fail(firstIssue(r.error))
  }
  const isFail = (v: unknown): v is AdminResult =>
    typeof v === 'object' && v !== null && (v as AdminResult).ok === false

  function withoutReason<T extends { reason?: unknown }>(input: T): Omit<T, 'reason'> {
    const { reason: _reason, ...rest } = input
    return rest
  }

  // ---- Propostas ----------------------------------------------------------

  async function saveProposalDraft(input: ProposalInput): Promise<AdminResult> {
    return guarded(input?.reason, async (reason) => {
      const data = parse(proposalSchema, withoutReason(input ?? ({} as ProposalInput)))
      if (isFail(data)) return data
      const fields = {
        candidate_id: data.candidateId,
        theme_id: data.themeId,
        description: data.description,
        source_kind: data.sourceKind,
        reference_year: nullable(data.referenceYear),
      }
      if (data.id) {
        await db.update('admin_update_proposal', { id: data.id, patch: fields, reason })
        return { ok: true, id: data.id }
      }
      // Proposta nova entra sempre em revisão (regra R19 também no banco).
      const created = await db.insert('proposals', { ...fields, status: 'em_revisao' })
      return { ok: true, id: created.id }
    })
  }

  async function setProposalStatus(
    id: string,
    status: 'publicada' | 'corrigida' | 'retirada',
    reason: string,
    sourceId?: string,
  ): Promise<AdminResult> {
    return guarded(reason, async (r) => {
      const pid = parse(idSchema, id)
      if (isFail(pid)) return pid
      if (sourceId !== undefined && sourceId !== '') {
        const sid = parse(idSchema, sourceId)
        if (isFail(sid)) return sid
      }
      // Pré-checagem amigável; a regra R18/R19 do banco continua como barreira final.
      if (status !== 'retirada' && (await db.countSourcesWithExcerpt(pid)) < 1) {
        return fail((await db.countPendingQuoteSources(pid)) > 0 ? MSG_PENDING_QUOTE : MSG_NO_SOURCE)
      }
      await db.update('admin_update_proposal', {
        id: pid,
        patch: { status },
        reason: r,
        sourceId: sourceId ? sourceId : undefined,
      })
      return { ok: true, id: pid }
    })
  }

  const publishProposal = (id: string, reason: string) => setProposalStatus(id, 'publicada', reason)
  const correctProposal = (id: string, reason: string, sourceId?: string) =>
    setProposalStatus(id, 'corrigida', reason, sourceId)
  const retractProposal = (id: string, reason: string, sourceId?: string) =>
    setProposalStatus(id, 'retirada', reason, sourceId)

  // ---- Fontes -------------------------------------------------------------

  function sourceFields(data: z.infer<typeof sourceSchema>): Row {
    return {
      url: data.url,
      outlet: nullable(data.outlet),
      published_on: nullable(data.publishedOn),
      consulted_on: nullable(data.consultedOn),
      kind: nullable(data.kind),
      excerpt: nullable(data.excerpt),
    }
  }

  async function addSource(
    proposalId: string,
    input: SourceInput,
    reason: string,
  ): Promise<AdminResult> {
    return guarded(reason, async () => {
      const pid = parse(idSchema, proposalId)
      if (isFail(pid)) return pid
      const data = parse(sourceSchema, input)
      if (isFail(data)) return data
      const created = await db.insert('sources', { proposal_id: pid, ...sourceFields(data) })
      return { ok: true, id: created.id }
    })
  }

  async function updateSource(
    id: string,
    input: SourceInput,
    reason: string,
  ): Promise<AdminResult> {
    return guarded(reason, async (r) => {
      const sid = parse(idSchema, id)
      if (isFail(sid)) return sid
      const data = parse(sourceSchema, input)
      if (isFail(data)) return data
      await db.update('admin_update_source', { id: sid, patch: sourceFields(data), reason: r })
      return { ok: true, id: sid }
    })
  }

  // published_at só é definido na primeira publicação: republicar mantém a data original.
  async function statusPatch(
    table: 'news' | 'analyses',
    id: string,
    status: 'publicada' | 'retirada',
  ): Promise<Row> {
    if (status !== 'publicada') return { status }
    const current = await db.currentPublishedAt(table, id)
    return current ? { status } : { status, published_at: now().toISOString() }
  }

  // ---- Notícias -----------------------------------------------------------

  async function saveNewsDraft(input: NewsInput): Promise<AdminResult> {
    return guarded(input?.reason, async (reason) => {
      const data = parse(newsSchema, withoutReason(input ?? ({} as NewsInput)))
      if (isFail(data)) return data
      const fields = {
        title: data.title,
        body: data.body,
        category: data.category,
        badge: data.badge,
        source_url: nullable(data.sourceUrl),
      }
      if (data.id) {
        await db.update('admin_update_news', { id: data.id, patch: fields, reason })
        return { ok: true, id: data.id }
      }
      if (!data.slug) return fail('Informe o identificador (slug).')
      const created = await db.insert('news', { ...fields, slug: data.slug, status: 'rascunho' })
      return { ok: true, id: created.id }
    })
  }

  async function setNewsStatus(
    id: string,
    status: 'publicada' | 'retirada',
    reason: string,
  ): Promise<AdminResult> {
    return guarded(reason, async (r) => {
      const nid = parse(idSchema, id)
      if (isFail(nid)) return nid
      const patch = await statusPatch('news', nid, status)
      await db.update('admin_update_news', { id: nid, patch, reason: r })
      return { ok: true, id: nid }
    })
  }
  const publishNews = (id: string, reason: string) => setNewsStatus(id, 'publicada', reason)
  const retractNews = (id: string, reason: string) => setNewsStatus(id, 'retirada', reason)

  // ---- Análises -----------------------------------------------------------

  async function saveAnalysisDraft(input: AnalysisInput): Promise<AdminResult> {
    return guarded(input?.reason, async (reason) => {
      const data = parse(analysisSchema, withoutReason(input ?? ({} as AnalysisInput)))
      if (isFail(data)) return data
      const fields = {
        title: data.title,
        facts: data.facts,
        candidate_statements: data.candidateStatements,
        editorial_interpretation: data.editorialInterpretation,
      }
      if (data.id) {
        await db.update('admin_update_analysis', { id: data.id, patch: fields, reason })
        return { ok: true, id: data.id }
      }
      if (!data.slug) return fail('Informe o identificador (slug).')
      const created = await db.insert('analyses', {
        ...fields,
        slug: data.slug,
        status: 'rascunho',
      })
      return { ok: true, id: created.id }
    })
  }

  async function setAnalysisStatus(
    id: string,
    status: 'publicada' | 'retirada',
    reason: string,
  ): Promise<AdminResult> {
    return guarded(reason, async (r) => {
      const aid = parse(idSchema, id)
      if (isFail(aid)) return aid
      const patch = await statusPatch('analyses', aid, status)
      await db.update('admin_update_analysis', { id: aid, patch, reason: r })
      return { ok: true, id: aid }
    })
  }
  const publishAnalysis = (id: string, reason: string) => setAnalysisStatus(id, 'publicada', reason)
  const retractAnalysis = (id: string, reason: string) => setAnalysisStatus(id, 'retirada', reason)

  // ---- Candidatos ---------------------------------------------------------

  async function saveCandidate(input: CandidateInput): Promise<AdminResult> {
    return guarded(input?.reason, async (reason) => {
      const data = parse(candidateSchema, withoutReason(input ?? ({} as CandidateInput)))
      if (isFail(data)) return data
      await db.update('admin_update_candidate', {
        id: data.id,
        reason,
        patch: {
          name: data.name,
          ticket_name: nullable(data.ticketName),
          vice: nullable(data.vice),
          status: data.status,
          bio: nullable(data.bio),
          club_history: nullable(data.clubHistory),
          trajectory: nullable(data.trajectory),
          photo_url: nullable(data.photoUrl),
        },
      })
      return { ok: true, id: data.id }
    })
  }

  // ---- Correções ----------------------------------------------------------

  // Atualização direta permitida pela RLS (status/handled_at). O motivo é exigido como
  // as demais ações; a tabela não tem coluna para guardá-lo.
  async function markCorrectionHandled(id: string, reason: string): Promise<AdminResult> {
    return guarded(reason, async () => {
      const cid = parse(idSchema, id)
      if (isFail(cid)) return cid
      const updated = await db.markCorrectionHandled(cid, now().toISOString())
      if (updated < 1) return fail('Pedido não encontrado ou sem permissão. Nada foi alterado.')
      return { ok: true, id: cid }
    })
  }

  return {
    saveProposalDraft,
    publishProposal,
    correctProposal,
    retractProposal,
    addSource,
    updateSource,
    saveNewsDraft,
    publishNews,
    retractNews,
    saveAnalysisDraft,
    publishAnalysis,
    retractAnalysis,
    saveCandidate,
    markCorrectionHandled,
  }
}

export type AdminCore = ReturnType<typeof makeAdminCore>
