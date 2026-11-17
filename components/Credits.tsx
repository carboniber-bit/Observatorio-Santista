import { CREDITS_NAME, CREDITS_URL } from '@/lib/brand'

function CreditsLink() {
  return (
    <a
      href={CREDITS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold underline underline-offset-4 hover:text-ink"
    >
      {CREDITS_NAME}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}

/** Linha discreta de crédito, no fim de todas as páginas (acima do aviso fixo de independência). */
export function CreditsLine() {
  return (
    <p className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-gray-3">
      Desenvolvido por <CreditsLink />
    </p>
  )
}

/** Seção completa de créditos (página Sobre). */
export function CreditsSection() {
  return (
    <section aria-labelledby="creditos" className="mt-10 rounded-2xl border border-gray-2 bg-gray-1 p-5">
      <h2 id="creditos" className="mb-2 text-xl font-bold">
        Créditos
      </h2>
      <p>
        Desenvolvimento e design do site: <CreditsLink />.
      </p>
      <p className="mt-2 text-sm text-gray-4">
        O conteúdo editorial, as fontes e as decisões de publicação são do Observatório Santista e seguem a
        Metodologia.
      </p>
    </section>
  )
}
