import { requireAdmin } from '@/lib/admin/auth'
import { formProposalStatus, formSaveProposal } from '@/lib/admin/form-actions'
import { sourceKindLabel } from '@/lib/editorial/labels'
import {
  BUTTON,
  BUTTON_SECONDARY,
  FIELD,
  Field,
  FlashMessage,
  PageShell,
  ReasonField,
  SelectField,
  relationName,
  statusLabel,
  type Flash,
} from '../_ui'

export const dynamic = 'force-dynamic'

const KINDS = ['documento_da_chapa', 'entrevista_direta', 'reportagem', 'declaracao_como_presidente']

type ProposalRow = {
  id: string
  candidate_id: string
  theme_id: string
  description: string
  source_kind: string
  reference_year: number | null
  status: string
  candidates: unknown
  themes: unknown
  sources: { id: string; url: string; excerpt: string | null }[] | null
}

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<Flash & { editar?: string }>
}) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const [proposals, candidates, themes] = await Promise.all([
    supabase
      .from('proposals')
      .select('*, candidates(name), themes(name), sources(id, url, excerpt)')
      .order('updated_at', { ascending: false }),
    supabase.from('candidates').select('id, name').order('name'),
    supabase.from('themes').select('id, name').order('position'),
  ])
  const rows = (proposals.data ?? []) as ProposalRow[]
  const editing = rows.find((p) => p.id === params.editar)
  const candidateOptions = ((candidates.data ?? []) as { id: string; name: string }[]).map((c) => ({
    value: c.id,
    label: c.name,
  }))
  const themeOptions = ((themes.data ?? []) as { id: string; name: string }[]).map((t) => ({
    value: t.id,
    label: t.name,
  }))

  return (
    <PageShell title="Propostas">
      <FlashMessage params={params} />
      {proposals.error ? <p role="alert">Não foi possível carregar as propostas.</p> : null}

      <section aria-labelledby="form-proposta" className="mb-10">
        <h2 id="form-proposta" className="mb-4 text-2xl font-bold">
          {editing ? 'Editar proposta' : 'Nova proposta'}
        </h2>
        <form action={formSaveProposal} className="max-w-2xl space-y-5" key={editing?.id ?? 'nova'}>
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <SelectField id="p-candidate" label="Candidato" name="candidateId" options={candidateOptions} defaultValue={editing?.candidate_id} required />
          <SelectField id="p-theme" label="Tema" name="themeId" options={themeOptions} defaultValue={editing?.theme_id} required />
          <Field id="p-description" label="Descrição da proposta" name="description" rows={5} maxLength={2000} required defaultValue={editing?.description} hint="Até 2000 caracteres. Texto neutro, igual para todos os candidatos." />
          <SelectField id="p-kind" label="Tipo de fonte" name="sourceKind" options={KINDS.map((k) => ({ value: k, label: sourceKindLabel(k) }))} defaultValue={editing?.source_kind} required />
          <Field id="p-year" label="Ano de referência (opcional)" name="referenceYear" type="number" defaultValue={editing?.reference_year} />
          <ReasonField id="p-reason" />
          <button type="submit" className={BUTTON}>
            Salvar proposta
          </button>
          <p className="text-sm text-gray-4">
            Proposta nova entra sempre em revisão. Para publicar, ela precisa de ao menos uma fonte
            com trecho comprobatório (cadastre em Fontes).
          </p>
        </form>
      </section>

      <section aria-labelledby="lista-propostas">
        <h2 id="lista-propostas" className="mb-4 text-2xl font-bold">
          Todas as propostas
        </h2>
        {rows.length === 0 ? <p>Nenhuma proposta cadastrada.</p> : null}
        <ul className="space-y-6">
          {rows.map((p) => {
            const withExcerpt = (p.sources ?? []).filter((s) => (s.excerpt ?? '').trim()).length
            return (
              <li key={p.id} className="border border-gray-2 p-4">
                <p className="text-sm text-gray-4">
                  {relationName(p.candidates)} · {relationName(p.themes)} · {statusLabel(p.status)} ·{' '}
                  {withExcerpt} fonte(s) com trecho
                </p>
                <p className="my-2">{p.description}</p>
                <p className="mb-3">
                  <a href={`/admin/propostas?editar=${p.id}#form-proposta`} className="underline underline-offset-4">
                    Editar
                  </a>
                </p>
                <details>
                  <summary className="min-h-11 cursor-pointer py-2 font-semibold">Mudar situação</summary>
                  {(['publish', 'correct', 'retract'] as const).map((op) => (
                    <form key={op} action={formProposalStatus} className="mt-3 max-w-xl space-y-4">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="op" value={op} />
                      <ReasonField id={`r-${p.id}-${op}`} />
                      {(p.sources ?? []).length > 0 ? (
                        <div>
                          <label htmlFor={`s-${p.id}-${op}`} className="mb-1 block font-semibold">
                            Fonte que fundamenta a mudança (opcional)
                          </label>
                          <select id={`s-${p.id}-${op}`} name="sourceId" defaultValue="" className={FIELD}>
                            <option value="">Nenhuma</option>
                            {(p.sources ?? []).map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.url}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                      <button type="submit" className={op === 'publish' ? BUTTON : BUTTON_SECONDARY}>
                        {op === 'publish' ? 'Publicar' : op === 'correct' ? 'Marcar como corrigida' : 'Retirar'}
                      </button>
                    </form>
                  ))}
                </details>
              </li>
            )
          })}
        </ul>
      </section>
    </PageShell>
  )
}
