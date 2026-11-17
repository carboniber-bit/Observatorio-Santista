import type { Metadata } from 'next'
import Link from 'next/link'
import { CreditsSection } from '@/components/Credits'
import { BRAND_NAME } from '@/lib/brand'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: `Sobre | ${BRAND_NAME}`,
  description: 'Quem faz o Observatório Santista 2026, como o projeto é mantido e por que é independente.',
  path: '/sobre',
})

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Sobre o Observatório</h1>
      <div className="space-y-4">
        <p>
          Este é um projeto independente, sem vínculo oficial com o Santos Futebol Clube, seus conselheiros, candidatos
          ou chapas. Seu objetivo é reunir informações públicas e verificáveis sobre a eleição presidencial de 2026 e
          oferecer uma simulação informal de intenção de voto entre os participantes da plataforma.
        </p>
        <p>
          A votação não é oficial, não substitui o processo eleitoral do clube e não representa necessariamente a
          opinião de todos os torcedores ou associados.
        </p>
        <p>
          As informações são apresentadas com o compromisso de imparcialidade, transparência e respeito aos envolvidos.
        </p>
      </div>
      <nav aria-label="Páginas institucionais" className="mt-8">
        <ul className="space-y-2">
          <li>
            <Link href="/metodologia" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Metodologia
            </Link>
          </li>
          <li>
            <Link href="/privacidade" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Política de Privacidade
            </Link>
          </li>
          <li>
            <Link href="/corrigir" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Solicitar correção
            </Link>
          </li>
        </ul>
      </nav>
      <CreditsSection />
    </main>
  )
}
