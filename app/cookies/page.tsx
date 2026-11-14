import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: `Cookies | ${BRAND_NAME}` }

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold sm:text-4xl">Cookies</h1>
      <p className="mb-6">Este site usa apenas cookies essenciais. Não há cookies de rastreamento, análise ou publicidade.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="mb-2 text-left font-semibold">Cookies utilizados</caption>
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="p-2">Nome</th>
              <th scope="col" className="p-2">Finalidade</th>
              <th scope="col" className="p-2">Duração</th>
              <th scope="col" className="p-2">HttpOnly</th>
              <th scope="col" className="p-2">Tipo</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-3">
              <th scope="row" className="p-2 font-mono">os26_voter</th>
              <td className="p-2">Limitar a um voto por navegador na simulação.</td>
              <td className="p-2">90 dias</td>
              <td className="p-2">Sim</td>
              <td className="p-2">Essencial</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-6">
        Preferência de filtro dos resultados: guardada apenas na URL, não é cookie.
      </p>
      <p className="mt-4">
        Durante a verificação anti-robô, o Cloudflare Turnstile pode definir seus próprios cookies ou armazenamento
        técnico em challenges.cloudflare.com. Eles são controlados pela Cloudflare e servem apenas a essa verificação.
      </p>
    </main>
  )
}
