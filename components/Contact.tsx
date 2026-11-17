import { CONTACT_EMAIL } from '@/lib/brand'

function MailLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline underline-offset-4">
      {CONTACT_EMAIL}
    </a>
  )
}

/** Caixa de contato para observações, sugestões e reclamações (páginas Sobre e Pedir correção). */
export function ContactSection() {
  return (
    <section aria-labelledby="contato" className="mt-10 rounded-2xl border border-gray-2 bg-gray-1 p-5">
      <h2 id="contato" className="mb-2 text-xl font-bold">
        Contato
      </h2>
      <p>
        Observações, sugestões ou reclamações sobre o site: <MailLink />.
      </p>
      <p className="mt-2 text-sm text-gray-4">
        Para apontar erro em uma informação publicada, prefira o formulário{' '}
        <a href="/corrigir" className="underline underline-offset-4">
          Solicitar correção
        </a>
        , que fica registrado no histórico público. Não envie dados pessoais desnecessários.
      </p>
    </section>
  )
}

/** Linha de contato no fim de todas as páginas. */
export function ContactLine() {
  return (
    <p className="mx-auto max-w-5xl px-4 pt-6 text-center text-sm text-gray-3">
      Observações ou reclamações: <MailLink />
    </p>
  )
}
