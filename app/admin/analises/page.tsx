import { requireAdmin } from '@/lib/admin/auth'
import { formPublishAnalysis, formRetractAnalysis, formSaveAnalysis } from '@/lib/admin/form-actions'
import { BUTTON, BUTTON_SECONDARY, Field, FlashMessage, PageShell, ReasonField, statusLabel, type Flash } from '../_ui'

export const dynamic = 'force-dynamic'

type AnalysisRow = {
  id: string
  slug: string
  title: string
  facts: string
  candidate_statements: string
  editorial_interpretation: string
  status: string
}

export default async function AnalysesAdminPage({
  searchParams,
}: {
  searchParams: Promise<Flash & { editar?: string }>
}) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('analyses').select('*').order('updated_at', { ascending: false })
  const rows = (data ?? []) as AnalysisRow[]
  const editing = rows.find((a) => a.id === params.editar)

  return (
    <PageShell title="Análises">
      <FlashMessage params={params} />
      {error ? <p role="alert">Não foi possível carregar as análises.</p> : null}
      <section aria-labelledby="form-analise" className="mb-10">
        <h2 id="form-analise" className="mb-4 text-2xl font-bold">
          {editing ? 'Editar análise' : 'Nova análise'}
        </h2>
        <p className="mb-4 text-sm text-gray-4">
          Mantenha os três blocos separados: fatos, declarações dos candidatos e interpretação
          editorial.
        </p>
        <form action={formSaveAnalysis} className="max-w-2xl space-y-5" key={editing?.id ?? 'nova'}>
          {editing ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : (
            <Field id="a-slug" label="Identificador (slug)" name="slug" required maxLength={80} hint="Minúsculas, números e hífens. Não pode ser alterado depois." />
          )}
          <Field id="a-title" label="Título" name="title" required maxLength={200} defaultValue={editing?.title} />
          <Field id="a-facts" label="Fatos" name="facts" rows={6} required maxLength={20000} defaultValue={editing?.facts} />
          <Field id="a-statements" label="Declarações dos candidatos" name="candidateStatements" rows={6} required maxLength={20000} defaultValue={editing?.candidate_statements} />
          <Field id="a-interp" label="Interpretação editorial" name="editorialInterpretation" rows={6} required maxLength={20000} defaultValue={editing?.editorial_interpretation} />
          <ReasonField id="a-reason" />
          <button type="submit" className={BUTTON}>
            Salvar análise
          </button>
        </form>
      </section>
      <section aria-labelledby="lista-analises">
        <h2 id="lista-analises" className="mb-4 text-2xl font-bold">
          Todas as análises
        </h2>
        {rows.length === 0 ? <p>Nenhuma análise cadastrada.</p> : null}
        <ul className="space-y-6">
          {rows.map((a) => (
            <li key={a.id} className="border border-gray-2 p-4">
              <p className="text-sm text-gray-4">{statusLabel(a.status)} · {a.slug}</p>
              <p className="my-1 font-semibold">{a.title}</p>
              <p className="mb-3">
                <a href={`/admin/analises?editar=${a.id}#form-analise`} className="underline underline-offset-4">
                  Editar
                </a>
              </p>
              <details>
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">Mudar situação</summary>
                <form className="mt-3 max-w-xl space-y-4">
                  <input type="hidden" name="id" value={a.id} />
                  <ReasonField id={`ar-${a.id}`} />
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" formAction={formPublishAnalysis} className={BUTTON}>
                      Publicar
                    </button>
                    <button type="submit" formAction={formRetractAnalysis} className={BUTTON_SECONDARY}>
                      Retirar
                    </button>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  )
}
