import { safeJsonLd, type JsonLd as JsonLdData } from '@/lib/seo'

// ÚNICO ponto do projeto autorizado a injetar HTML bruto: o conteúdo é sempre
// JSON.stringify de um objeto nosso, com "<" escapado por safeJsonLd.
export function JsonLd({ data }: { data: JsonLdData }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />
}
