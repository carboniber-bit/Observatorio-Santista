import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = { title: `Privacidade | ${BRAND_NAME}` }

const H2 = 'mb-3 text-2xl font-bold'
const LINK = 'underline underline-offset-4'

export default function PrivacidadePage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Política de Privacidade</h1>
      <div className="space-y-10">
        <section aria-labelledby="controlador">
          <h2 id="controlador" className={H2}>
            Controlador
          </h2>
          <p>
            O controlador dos dados é o autor deste projeto, uma pessoa física independente, sem vínculo com o Santos
            Futebol Clube. Os direitos de titular previstos na Lei 13.709/2018 (LGPD) podem ser exercidos por este
            canal:{' '}
            {email ? (
              <a href={`mailto:${email}`} className={LINK}>
                {email}
              </a>
            ) : (
              <>
                o formulário de{' '}
                <Link href="/corrigir" className={LINK}>
                  solicitação de correção
                </Link>
              </>
            )}
            .
          </p>
        </section>

        <section aria-labelledby="dados">
          <h2 id="dados" className={H2}>
            Dados coletados
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Voto: a escolha de candidato (ou branco/indeciso), a autodeclaração de sócio e o momento do voto.</li>
            <li>Cookie aleatório essencial <code>os26_voter</code>, usado para limitar um voto por navegador.</li>
            <li>
              Hash temporário, irreversível e com sal diário, derivado de dados de rede, usado apenas para detectar
              abuso e apagado após 7 dias. O endereço IP não é armazenado.
            </li>
            <li>O token do desafio Turnstile é processado pela Cloudflare para verificar que o acesso não é automatizado.</li>
            <li>Pedidos de correção: o texto, um link opcional e um e-mail opcional, além de um hash temporário do remetente, apagado após 7 dias.</li>
            <li>
              Hash do token do cookie: o servidor guarda apenas um hash (nunca o valor bruto) do token aleatório do
              cookie, com a data de criação truncada ao dia, para impedir votos duplicados. Esse registro não é apagado
              pela rotina de 7 dias; é mantido enquanto for necessário para a integridade da votação.
            </li>
          </ul>
          <p className="mt-3">Não usamos ferramentas de análise de audiência nem publicidade.</p>
        </section>

        <section aria-labelledby="finalidade">
          <h2 id="finalidade" className={H2}>
            Finalidade e base legal
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Registrar a simulação e prevenir abuso e votos repetidos: legítimo interesse do controlador, com coleta
              mínima.
            </li>
            <li>E-mail opcional de correção: consentimento, dado apenas para retorno sobre o pedido.</li>
          </ul>
        </section>

        <section aria-labelledby="retencao">
          <h2 id="retencao" className={H2}>
            Retenção
          </h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Hash temporário: apagado após 7 dias.</li>
            <li>E-mail opcional de correção: apagado 90 dias após o tratamento do pedido.</li>
            <li>Votos: mantidos de forma anônima (candidato, autodeclaração de sócio, sinalização de validade e momento do voto), sem ligação com uma pessoa.</li>
          </ul>
        </section>

        <section aria-labelledby="compartilhamento">
          <h2 id="compartilhamento" className={H2}>
            Compartilhamento
          </h2>
          <p>
            Os dados são tratados por operadores que prestam a infraestrutura do projeto: Supabase (banco de dados),
            Vercel (hospedagem) e Cloudflare Turnstile (verificação anti-robô). Não vendemos nem cedemos dados a
            terceiros para outros fins.
          </p>
        </section>

        <section aria-labelledby="direitos">
          <h2 id="direitos" className={H2}>
            Direitos do titular
          </h2>
          <p>
            Conforme o art. 18 da LGPD, você pode solicitar confirmação do tratamento, acesso, correção, anonimização,
            eliminação, informação sobre compartilhamento e revogação do consentimento. Os votos são anônimos e não
            podem ser associados a uma pessoa; por isso não é possível localizar ou alterar um voto individual.
          </p>
        </section>

        <section aria-labelledby="cookies">
          <h2 id="cookies" className={H2}>
            Cookies
          </h2>
          <p>
            Usamos apenas um cookie essencial. Veja a{' '}
            <Link href="/cookies" className={LINK}>
              página de cookies
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
