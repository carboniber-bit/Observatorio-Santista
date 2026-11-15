import { validateEntries, type SeedEntry, type ValidateOptions } from './schema.ts'

export type ProposalRow = {
  candidate_id: string
  theme_id: string
  description: string
  source_kind: string
  reference_year: number | null
  status: 'em_revisao'
}

export type SourceRow = {
  proposal_id: string
  url: string
  outlet: string
  published_on: string
  consulted_on: string
  kind: string
  excerpt: string
}

export interface SeedDb {
  findCandidateId(slug: string): Promise<string | null>
  findThemeId(slug: string): Promise<string | null>
  findProposalId(key: { candidate_id: string; theme_id: string; description: string }): Promise<string | null>
  listSourceUrls(proposal_id: string): Promise<string[]>
  insertProposal(row: ProposalRow): Promise<{ id: string }>
  insertSource(row: SourceRow): Promise<unknown>
}

export type InsertResult = { inserted: number; skipped: number }

// Insere sempre com status 'em_revisao' (não configurável). Idempotente: pula quando já existe
// proposta com mesmo candidato + tema + descrição (reutiliza o id e insere só as fontes cuja
// URL ainda falta, o que recupera falhas parciais). Aborta antes de qualquer escrita se a
// validação falhar ou faltar candidato/tema no banco.
export async function insertSeed(
  entries: SeedEntry[],
  deps: { db: SeedDb },
  opts: ValidateOptions = {},
): Promise<InsertResult> {
  const valid = validateEntries(entries, opts)
  const { db } = deps

  const candidateIds = new Map<string, string>()
  const themeIds = new Map<string, string>()
  for (const e of valid) {
    if (!candidateIds.has(e.candidateSlug)) {
      const id = await db.findCandidateId(e.candidateSlug)
      if (!id) throw new Error(`Candidato não encontrado no banco: ${e.candidateSlug}`)
      candidateIds.set(e.candidateSlug, id)
    }
    if (!themeIds.has(e.themeSlug)) {
      const id = await db.findThemeId(e.themeSlug)
      if (!id) throw new Error(`Tema não encontrado no banco: ${e.themeSlug}`)
      themeIds.set(e.themeSlug, id)
    }
  }

  let inserted = 0
  let skipped = 0
  for (const e of valid) {
    const candidate_id = candidateIds.get(e.candidateSlug) as string
    const theme_id = themeIds.get(e.themeSlug) as string
    const description = e.description.trim()
    let proposalId = await db.findProposalId({ candidate_id, theme_id, description })
    let existingUrls = new Set<string>()
    let added = 0
    if (proposalId) {
      existingUrls = new Set((await db.listSourceUrls(proposalId)).map((u) => u.trim()))
    } else {
      const row = await db.insertProposal({
        candidate_id,
        theme_id,
        description,
        source_kind: e.sourceKind,
        reference_year: e.referenceYear,
        status: 'em_revisao',
      })
      proposalId = row.id
      added++
    }
    for (const s of e.sources) {
      const url = s.url.trim()
      if (existingUrls.has(url)) continue
      await db.insertSource({
        proposal_id: proposalId,
        url,
        outlet: s.outlet.trim(),
        published_on: s.publishedOn,
        consulted_on: s.consultedOn,
        kind: s.kind,
        excerpt: s.excerpt.trim(),
      })
      existingUrls.add(url)
      added++
    }
    if (added > 0) inserted++
    else skipped++
  }
  return { inserted, skipped }
}
