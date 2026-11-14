import { requireAdmin } from '@/lib/admin/auth'
import { formAddSource, formUpdateSource } from '@/lib/admin/form-actions'
import { BUTTON, Field, FlashMessage, PageShell, ReasonField, SelectField, type Flash } from '../_ui'

export const dynamic = 'force-dynamic'

type SourceRow = {
  id: string
  proposal_id: string
  url: string
  outlet: string | null
  published_on: string | null
  consulted_on: string | null
  kind: string | null
  excerpt: string | null
}

export default async function SourcesPage({ searchParams }: { searchParams: Promise<Flash> }) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const [sources, proposals] = await Promise.all([
    supabase.from('sources').select('*').order('proposal_id'),
    supabase.from('proposals').select('id, description, candidates(name)').order('updated_at', { ascending: false }),
  ])
  const rows = (sources.data ?? []) as SourceRow[]
  const proposalOptions = (
    (proposals.data ?? []) as { id: string; description: string; candidates: unknown }[]
  ).map((p) => {
    const c = Array.isArray(p.candidates) ? p.candidates[0] : p.candidates
    const name = c && typeof c === 'object' && 'name' in c ? String((c as { name: unknown }).name) : ''
    const text = p.description.length > 70 ? `${p.description.slice(0, 70)}…` : p.description
    return { value: p.id, label: `${name}: ${text}` }
  })

  return (
    <PageShell title="Fontes">
      <FlashMessage params={params} />
      <section aria-labelledby="nova-fonte" className="mb-10">
        <h2 id="nova-fonte" className="mb-4 text-2xl font-bold">
          Adicionar fonte
        </h2>
        <form action={formAddSource} className="max-w-2xl space-y-5">
          <SelectField id="f-proposal" label="Proposta" name="proposalId" options={proposalOptions} required />
          <Field id="f-url" label="Link (http ou https)" name="url" type="url" required maxLength={500} />
          <Field id="f-outlet" label="Veículo (opcional)" name="outlet" maxLength={200} />
          <Field id="f-published" label="Data de publicação (opcional)" name="publishedOn" type="date" />
          <Field id="f-consulted" label="Data da consulta (opcional)" name="consultedOn" type="date" />
          <Field id="f-kind" label="Tipo (opcional)" name="kind" maxLength={100} />
          <Field id="f-excerpt" label="Trecho comprobatório" name="excerpt" rows={4} maxLength={4000} hint="Sem ao menos uma fonte com trecho preenchido, a proposta não pode ser publicada." />
          <ReasonField id="f-reason" />
          <button type="submit" className={BUTTON}>
            Adicionar fonte
          </button>
        </form>
      </section>

      <section aria-labelledby="lista-fontes">
        <h2 id="lista-fontes" className="mb-4 text-2xl font-bold">
          Fontes cadastradas
        </h2>
        {rows.length === 0 ? <p>Nenhuma fonte cadastrada.</p> : null}
        <ul className="space-y-6">
          {rows.map((s) => (
            <li key={s.id} className="border border-gray-2 p-4">
              <p className="break-all font-semibold">{s.url}</p>
              <p className="text-sm text-gray-4">{s.outlet ?? 'Veículo não informado'}</p>
              <p className="my-2">{s.excerpt?.trim() ? s.excerpt : 'Sem trecho comprobatório.'}</p>
              <details>
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">Editar fonte</summary>
                <form action={formUpdateSource} className="mt-3 max-w-2xl space-y-5">
                  <input type="hidden" name="id" value={s.id} />
                  <Field id={`u-url-${s.id}`} label="Link (http ou https)" name="url" type="url" required maxLength={500} defaultValue={s.url} />
                  <Field id={`u-outlet-${s.id}`} label="Veículo" name="outlet" maxLength={200} defaultValue={s.outlet} />
                  <Field id={`u-pub-${s.id}`} label="Data de publicação" name="publishedOn" type="date" defaultValue={s.published_on} />
                  <Field id={`u-cons-${s.id}`} label="Data da consulta" name="consultedOn" type="date" defaultValue={s.consulted_on} />
                  <Field id={`u-kind-${s.id}`} label="Tipo" name="kind" maxLength={100} defaultValue={s.kind} />
                  <Field id={`u-exc-${s.id}`} label="Trecho comprobatório" name="excerpt" rows={4} maxLength={4000} defaultValue={s.excerpt} />
                  <ReasonField id={`u-reason-${s.id}`} />
                  <button type="submit" className={BUTTON}>
                    Salvar fonte
                  </button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  )
}
