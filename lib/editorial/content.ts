import { createAnonClient } from '@/lib/supabase/anon'
import type { Tables } from '@/lib/db/types'
import { NEWS_CATEGORIES, type NewsCategory } from './labels'

export type { NewsCategory }
export type News = Tables<'news'>
export type Analysis = Tables<'analyses'>

// Categoria desconhecida ou ausente => null (todas).
export function parseCategory(value: string | string[] | undefined): NewsCategory | null {
  const first = Array.isArray(value) ? value[0] : value
  if (first === undefined) return null
  return (NEWS_CATEGORIES as readonly string[]).includes(first) ? (first as NewsCategory) : null
}

export async function getPublishedNews(category?: NewsCategory | null): Promise<News[]> {
  const supabase = createAnonClient()
  let query = supabase
    .from('news')
    .select('*')
    .eq('status', 'publicada')
    .order('published_at', { ascending: false, nullsFirst: false })
  if (category) query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw new Error(`Falha ao carregar notícias: ${error.message}`)
  // A RLS é a barreira real; estes filtros são defesa em profundidade.
  return ((data ?? []) as News[]).filter(
    (n) => n.status === 'publicada' && (!category || n.category === category),
  )
}

export async function getAnalyses(): Promise<Analysis[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('status', 'publicada')
    .order('published_at', { ascending: false, nullsFirst: false })
  if (error) throw new Error(`Falha ao carregar análises: ${error.message}`)
  return ((data ?? []) as Analysis[]).filter((a) => a.status === 'publicada')
}

export async function getAnalysisBySlug(slug: string): Promise<Analysis | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'publicada')
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar análise: ${error.message}`)
  const row = (data as Analysis | null) ?? null
  return row && row.status === 'publicada' ? row : null
}
