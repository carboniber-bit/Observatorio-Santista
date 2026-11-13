import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { NewsList } from '@/components/NewsList'
import { BRAND_NAME } from '@/lib/brand'
import { getPublishedNews, parseCategory } from '@/lib/editorial/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Notícias | ${BRAND_NAME}`,
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function NoticiasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const category = parseCategory(params.categoria)

  let body: ReactNode
  try {
    const items = await getPublishedNews(category)
    body = <NewsList items={items} category={category} />
  } catch {
    body = (
      <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
        Não foi possível carregar as notícias agora. Tente novamente em alguns instantes.
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 font-serif text-3xl font-bold sm:text-4xl">Notícias</h1>
      {body}
    </main>
  )
}
