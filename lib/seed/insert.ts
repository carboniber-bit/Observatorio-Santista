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
  proposalExists(key: { candidate_id: string; theme_id: string; description: string }): Promise<boolean>
  insertProposal(row: ProposalRow): Promise<{ id: string }>
  insertSource(row: SourceRow): Promise<unknown>
}

export type InsertResult = { inserted: number; skipped: number }

// Insere sempre com status 'em_revisao' (não configurável). Idempotente: pula quando já existe
// proposta com mesmo candidato + tema + descrição. Aborta antes de qualquer escrita se a
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
    if (await db.proposalExists({ candidate_id, theme_id, description })) {
      skipped++
      continue
    }
    const { id } = await db.insertProposal({
      candidate_id,
      theme_id,
      description,
      source_kind: e.sourceKind,
      reference_year: e.referenceYear,
      status: 'em_revisao',
    })
    for (const s of e.sources) {
      await db.insertSource({
        proposal_id: id,
        url: s.url.trim(),
        outlet: s.outlet.trim(),
        published_on: s.publishedOn,
        consulted_on: s.consultedOn,
        kind: s.kind,
        excerpt: s.excerpt.trim(),
      })
    }
    inserted++
  }
  return { inserted, skipped }
}
