'use server'

import { redirect } from 'next/navigation'
import * as actions from './actions'
import type { AdminResult } from './core'

// Adaptadores de <form action>: leem o FormData, chamam a ação e voltam à página com
// uma mensagem (?ok= ou ?erro=). Funcionam sem JavaScript no navegador.

function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v : ''
}

// Códigos fixos na URL; o texto exibido vem de uma tabela no servidor (app/admin/_ui.tsx).
function errorCode(message: string): string {
  if (/motivo da altera/i.test(message)) return 'motivo'
  if (/sem fonte com trecho/i.test(message)) return 'fonte'
  if (/Mantenha o trecho/i.test(message)) return 'trecho'
  if (/Acesso negado/i.test(message)) return 'acesso'
  if (/identificador \(slug\)/i.test(message) && /Já existe/.test(message)) return 'duplicado'
  if (/não encontrado ou sem permissão/i.test(message)) return 'inexistente'
  if (/Nada foi alterado/i.test(message)) return 'falha'
  return 'invalido'
}

function back(path: string, result: AdminResult, okCode: string, editId?: string): never {
  const params = new URLSearchParams()
  if (result.ok) {
    params.set('ok', okCode)
  } else {
    params.set('erro', errorCode(result.error))
    if (editId) params.set('editar', editId)
  }
  redirect(`${path}?${params.toString()}`)
}

export async function formSaveProposal(fd: FormData): Promise<void> {
  const id = str(fd, 'id')
  const result = await actions.saveProposalDraft({
    id: id || undefined,
    candidateId: str(fd, 'candidateId'),
    themeId: str(fd, 'themeId'),
    description: str(fd, 'description'),
    sourceKind: str(fd, 'sourceKind') as never,
    referenceYear: str(fd, 'referenceYear') as never,
    reason: str(fd, 'reason'),
  })
  back('/admin/propostas', result, 'proposta', id || undefined)
}

export async function formProposalStatus(fd: FormData): Promise<void> {
  const op = str(fd, 'op')
  const id = str(fd, 'id')
  const reason = str(fd, 'reason')
  const sourceId = str(fd, 'sourceId') || undefined
  let result: AdminResult
  let msg: string
  if (op === 'publish') {
    result = await actions.publishProposal(id, reason)
    msg = 'publicada'
  } else if (op === 'correct') {
    result = await actions.correctProposal(id, reason, sourceId)
    msg = 'corrigida'
  } else if (op === 'retract') {
    result = await actions.retractProposal(id, reason, sourceId)
    msg = 'retirada'
  } else {
    result = { ok: false, error: 'Operação inválida.' }
    msg = ''
  }
  back('/admin/propostas', result, msg)
}

export async function formAddSource(fd: FormData): Promise<void> {
  const result = await actions.addSource(
    str(fd, 'proposalId'),
    {
      url: str(fd, 'url'),
      outlet: str(fd, 'outlet'),
      publishedOn: str(fd, 'publishedOn'),
      consultedOn: str(fd, 'consultedOn'),
      kind: str(fd, 'kind'),
      excerpt: str(fd, 'excerpt'),
    },
    str(fd, 'reason'),
  )
  back('/admin/fontes', result, 'fonte')
}

export async function formUpdateSource(fd: FormData): Promise<void> {
  const result = await actions.updateSource(
    str(fd, 'id'),
    {
      url: str(fd, 'url'),
      outlet: str(fd, 'outlet'),
      publishedOn: str(fd, 'publishedOn'),
      consultedOn: str(fd, 'consultedOn'),
      kind: str(fd, 'kind'),
      excerpt: str(fd, 'excerpt'),
    },
    str(fd, 'reason'),
  )
  back('/admin/fontes', result, 'fonte')
}

export async function formSaveNews(fd: FormData): Promise<void> {
  const id = str(fd, 'id')
  const result = await actions.saveNewsDraft({
    id: id || undefined,
    slug: str(fd, 'slug'),
    title: str(fd, 'title'),
    body: str(fd, 'body'),
    category: str(fd, 'category') as never,
    badge: str(fd, 'badge') as never,
    sourceUrl: str(fd, 'sourceUrl'),
    reason: str(fd, 'reason'),
  })
  back('/admin/noticias', result, 'noticia', id || undefined)
}

export async function formNewsStatus(fd: FormData): Promise<void> {
  const op = str(fd, 'op')
  const id = str(fd, 'id')
  const reason = str(fd, 'reason')
  const result =
    op === 'publish'
      ? await actions.publishNews(id, reason)
      : op === 'retract'
        ? await actions.retractNews(id, reason)
        : ({ ok: false, error: 'Operação inválida.' } as AdminResult)
  back('/admin/noticias', result, op === 'publish' ? 'publicada' : 'retirada')
}

export async function formSaveAnalysis(fd: FormData): Promise<void> {
  const id = str(fd, 'id')
  const result = await actions.saveAnalysisDraft({
    id: id || undefined,
    slug: str(fd, 'slug'),
    title: str(fd, 'title'),
    facts: str(fd, 'facts'),
    candidateStatements: str(fd, 'candidateStatements'),
    editorialInterpretation: str(fd, 'editorialInterpretation'),
    reason: str(fd, 'reason'),
  })
  back('/admin/analises', result, 'analise', id || undefined)
}

export async function formAnalysisStatus(fd: FormData): Promise<void> {
  const op = str(fd, 'op')
  const id = str(fd, 'id')
  const reason = str(fd, 'reason')
  const result =
    op === 'publish'
      ? await actions.publishAnalysis(id, reason)
      : op === 'retract'
        ? await actions.retractAnalysis(id, reason)
        : ({ ok: false, error: 'Operação inválida.' } as AdminResult)
  back('/admin/analises', result, op === 'publish' ? 'publicada' : 'retirada')
}

export async function formSaveCandidate(fd: FormData): Promise<void> {
  const id = str(fd, 'id')
  const result = await actions.saveCandidate({
    id,
    name: str(fd, 'name'),
    ticketName: str(fd, 'ticketName'),
    vice: str(fd, 'vice'),
    status: str(fd, 'status') as never,
    bio: str(fd, 'bio'),
    clubHistory: str(fd, 'clubHistory'),
    trajectory: str(fd, 'trajectory'),
    photoUrl: str(fd, 'photoUrl'),
    reason: str(fd, 'reason'),
  })
  back('/admin/candidatos', result, 'candidato', id || undefined)
}

export async function formHandleCorrection(fd: FormData): Promise<void> {
  const result = await actions.markCorrectionHandled(str(fd, 'id'), str(fd, 'reason'))
  back('/admin/correcoes', result, 'correcao')
}
