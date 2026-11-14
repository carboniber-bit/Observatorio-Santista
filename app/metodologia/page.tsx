import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: `Metodologia | ${BRAND_NAME}` }

const H2 = 'mb-3 text-2xl font-bold'

export default function MetodologiaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Metodologia</h1>
      <div className="space-y-10">
        <section aria-labelledby="criterios">
          <h2 id="criterios" className={H2}>
            Critérios editoriais
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Usamos apenas fontes públicas e verificáveis.</li>
            <li>Uma proposta só é publicada com fonte e trecho comprobatório.</li>
            <li>Propostas importadas entram sempre com o status em revisão, até a conferência da fonte.</li>
            <li>
              Toda edição exige um motivo e fica registrada no <Link href="/historico" className="underline underline-offset-4">histórico de alterações</Link>;
              nada é apagado.
            </li>
            <li>Os quatro candidatos são apresentados com o mesmo componente e os mesmos campos, na mesma ordem.</li>
            <li>Não há ranking de candidatos nem adjetivos nos textos editoriais.</li>
          </ul>
        </section>

        <section aria-labelledby="simulacao">
          <h2 id="simulacao" className={H2}>
            Metodologia da simulação
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>A participação é voluntária e informal: votação espontânea, não é pesquisa científica.</li>
            <li>A condição de sócio é autodeclarada e não é verificada.</li>
            <li>
              Cada navegador pode votar uma vez, controlado por um cookie essencial. Limpar os cookies pode permitir
              outro voto; essa limitação é conhecida.
            </li>
            <li>
              Cada hash anônimo de rede pode registrar até 5 votos por hora. Do sexto voto em diante, no mesmo hash
              dentro de uma hora, o voto é marcado como suspeito: não entra nos totais nem nos percentuais e aparece
              apenas como contagem de votos descartados.
            </li>
            <li>
              A votação fica aberta até 11/12/2026 às 23:59 (horário de Brasília). Depois disso os resultados ficam
              congelados.
            </li>
            <li>Um desafio anti-robô (Cloudflare Turnstile) é verificado antes do registro do voto.</li>
          </ul>
        </section>

        <section aria-labelledby="limitacoes">
          <h2 id="limitacoes" className={H2}>
            Limitações da pesquisa
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>A amostra é autosselecionada e não é representativa dos torcedores ou associados.</li>
            <li>Não há verificação de identidade dos participantes.</li>
            <li>Pode haver ação coordenada, que os controles reduzem, mas não eliminam.</li>
            <li>A ausência de proposta publicada não significa ausência de posição do candidato.</li>
          </ul>
        </section>

        <section aria-labelledby="privacidade">
          <h2 id="privacidade" className={H2}>
            Privacidade e proteção de dados
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Os votos não guardam nome, CPF, e-mail, telefone nem endereço IP.</li>
            <li>O hash temporário usado para detectar abuso é apagado após 7 dias.</li>
            <li>O e-mail opcional de um pedido de correção é apagado 90 dias após o tratamento do pedido.</li>
          </ul>
          <p className="mt-3">
            Detalhes na{' '}
            <Link href="/privacidade" className="underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
