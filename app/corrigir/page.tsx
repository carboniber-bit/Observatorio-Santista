import type { Metadata } from 'next'
import { CorrectionForm } from '@/components/CorrectionForm'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Pedir correção | ${BRAND_NAME}`,
}

export default function CorrigirPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-4 text-3xl font-bold sm:text-4xl">Pedir correção</h1>
      <p className="mb-4">
        Encontrou um erro ou uma informação desatualizada? Descreva o que precisa ser corrigido e,
        se possível, indique uma fonte. Cada pedido é analisado pela equipe do Observatório.
      </p>
      <p className="mb-8 border border-gray-2 bg-gray-1 p-4 text-sm text-gray-4">
        Não pedimos nome nem CPF. O e-mail é opcional e é apagado 90 dias após o tratamento do
        pedido.
      </p>
      <CorrectionForm />
    </main>
  )
}
