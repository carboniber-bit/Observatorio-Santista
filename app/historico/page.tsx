import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ChangeLogList } from '@/components/ChangeLogList'
import { BRAND_NAME } from '@/lib/brand'
import { getChangeLog } from '@/lib/editorial/changelog'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `Histórico de atualizações | ${BRAND_NAME}`,
}

export default async function HistoricoPage() {
  let body: ReactNode
  try {
    const entries = await getChangeLog()
    body = <ChangeLogList entries={entries} />
  } catch {
    body = (
      <p role="alert" className="border border-gray-3 bg-gray-1 p-4">
        Não foi possível carregar o histórico agora. Tente novamente em alguns instantes.
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-3xl font-bold sm:text-4xl">Histórico de atualizações</h1>
      <p className="mb-8 mt-4 max-w-2xl">
        Toda alteração em propostas, notícias, análises e candidatos é registrada com motivo e
        fonte. Nada é apagado.
      </p>
      {body}
    </main>
  )
}
