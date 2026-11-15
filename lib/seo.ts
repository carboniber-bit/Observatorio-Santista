import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'

// Endereço público do site. Defina NEXT_PUBLIC_SITE_URL em produção.
// O valor padrão abaixo é um MARCADOR: troque pelo domínio real antes do lançamento.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://observatorio-santista.vercel.app').replace(
  /\/+$/,
  '',
)

export const CANDIDATE_SLUGS = ['marcelo-teixeira', 'mauricio-maruca', 'jose-renato-quaresma', 'ivan-luduvice'] as const

export const PUBLIC_PATHS: readonly string[] = [
  '/',
  '/votar',
  '/resultados',
  '/comparador',
  ...CANDIDATE_SLUGS.map((s) => `/candidatos/${s}`),
  '/noticias',
  '/analises',
  '/historico',
  '/sobre',
  '/metodologia',
  '/privacidade',
  '/cookies',
  '/corrigir',
]

export function absoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return p === '/' ? `${SITE_URL}/` : `${SITE_URL}${p}`
}

export function pageMetadata(input: { title: string; description: string; path: string }): Metadata {
  const url = absoluteUrl(input.path)
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: BRAND_NAME,
      title: input.title,
      description: input.description,
      url,
    },
    twitter: { card: 'summary', title: input.title, description: input.description },
  }
}

export type JsonLd = Record<string, unknown>

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: absoluteUrl('/'),
    inLanguage: 'pt-BR',
  }
}

// Somente nome e endereço: nenhuma afirmação sobre a pessoa.
export function candidatePageJsonLd(name: string, slug: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: absoluteUrl(`/candidatos/${slug}`),
  }
}

// Serializa para uso dentro de <script type="application/ld+json">.
// Escapa "<" (e separadores de linha unicode) para que nenhum valor feche a tag <script>.
export function safeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
