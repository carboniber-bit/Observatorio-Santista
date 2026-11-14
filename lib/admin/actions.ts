'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from './auth'
import { makeAdminCore, type AdminResult } from './core'
import { makeSupabaseAdminDb } from './db'
import type {
  AnalysisInput,
  CandidateInput,
  NewsInput,
  ProposalInput,
  SourceInput,
} from './schemas'

// Ações de servidor: finas, ligam as dependências reais ao núcleo testado em core.ts.
// Cada chamada monta um núcleo novo; requireAdmin roda primeiro e fornece o cliente
// com a sessão do admin.
function core() {
  let client: SupabaseClient | undefined
  return makeAdminCore({
    requireAdmin: async () => {
      client = (await requireAdmin()).supabase
    },
    db: makeSupabaseAdminDb(() => {
      if (!client) throw new Error('sessão ausente')
      return client
    }),
  })
}

export async function saveProposalDraft(input: ProposalInput): Promise<AdminResult> {
  return core().saveProposalDraft(input)
}
export async function publishProposal(id: string, reason: string): Promise<AdminResult> {
  return core().publishProposal(id, reason)
}
export async function correctProposal(
  id: string,
  reason: string,
  sourceId?: string,
): Promise<AdminResult> {
  return core().correctProposal(id, reason, sourceId)
}
export async function retractProposal(
  id: string,
  reason: string,
  sourceId?: string,
): Promise<AdminResult> {
  return core().retractProposal(id, reason, sourceId)
}
export async function addSource(
  proposalId: string,
  input: SourceInput,
  reason: string,
): Promise<AdminResult> {
  return core().addSource(proposalId, input, reason)
}
export async function updateSource(
  id: string,
  input: SourceInput,
  reason: string,
): Promise<AdminResult> {
  return core().updateSource(id, input, reason)
}
export async function saveNewsDraft(input: NewsInput): Promise<AdminResult> {
  return core().saveNewsDraft(input)
}
export async function publishNews(id: string, reason: string): Promise<AdminResult> {
  return core().publishNews(id, reason)
}
export async function retractNews(id: string, reason: string): Promise<AdminResult> {
  return core().retractNews(id, reason)
}
export async function saveAnalysisDraft(input: AnalysisInput): Promise<AdminResult> {
  return core().saveAnalysisDraft(input)
}
export async function publishAnalysis(id: string, reason: string): Promise<AdminResult> {
  return core().publishAnalysis(id, reason)
}
export async function retractAnalysis(id: string, reason: string): Promise<AdminResult> {
  return core().retractAnalysis(id, reason)
}
export async function saveCandidate(input: CandidateInput): Promise<AdminResult> {
  return core().saveCandidate(input)
}
export async function markCorrectionHandled(id: string, reason: string): Promise<AdminResult> {
  return core().markCorrectionHandled(id, reason)
}
