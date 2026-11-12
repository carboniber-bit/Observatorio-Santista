import { createAnonClient } from '@/lib/supabase/anon'
import type { Tables } from '@/lib/db/types'

export type Candidate = Tables<'candidates'>
export type Theme = Tables<'themes'>
export type Proposal = Tables<'proposals'>
export type Source = Tables<'sources'>
export type ProposalWithSources = Proposal & { sources: Source[] }

const PUBLIC_STATUSES: readonly string[] = ['publicada', 'corrigida']

export function isPublicStatus(status: string): boolean {
  return PUBLIC_STATUSES.includes(status)
}

// Ordem neutra e fixa: alfabética por nome, no collation pt-BR (acentos corretos).
// Não muta a entrada.
export function sortCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

// Forma crua devolvida pelo PostgREST para proposals + sources aninhadas.
type ProposalRow = Proposal & { sources: Source[] | null }

// Mapper explícito: evita `any` e garante `sources` sempre como array.
function toProposalWithSources(row: ProposalRow): ProposalWithSources {
  return { ...row, sources: row.sources ?? [] }
}

export async function getCandidates(): Promise<Candidate[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase.from('candidates').select('*')
  if (error) throw new Error(`Falha ao carregar candidatos: ${error.message}`)
  return sortCandidates((data ?? []) as Candidate[])
}

export async function getCandidateBySlug(slug: string): Promise<Candidate | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar candidato: ${error.message}`)
  return (data as Candidate | null) ?? null
}

export async function getThemes(): Promise<Theme[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw new Error(`Falha ao carregar temas: ${error.message}`)
  return (data ?? []) as Theme[]
}

export async function getPublishedProposals(candidateId: string): Promise<ProposalWithSources[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('proposals')
    .select('*, sources(*)')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Falha ao carregar propostas: ${error.message}`)
  const rows = (data ?? []) as unknown as ProposalRow[]
  // A RLS é a barreira real; este filtro é defesa em profundidade.
  return rows.filter((r) => isPublicStatus(r.status)).map(toProposalWithSources)
}
