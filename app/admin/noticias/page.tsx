import { requireAdmin } from '@/lib/admin/auth'
import { formNewsStatus, formSaveNews } from '@/lib/admin/form-actions'
import { BADGE_LABELS, NEWS_CATEGORY_LABELS } from '@/lib/editorial/labels'
import { BUTTON, BUTTON_SECONDARY, Field, FlashMessage, PageShell, ReasonField, SelectField, statusLabel, type Flash } from '../_ui'

export const dynamic = 'force-dynamic'

type NewsRow = {
  id: string
  slug: string
  title: string
  body: string
  category: string
  badge: string
  source_url: string | null
  status: string
}

export default async function NewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Flash & { editar?: string }>
}) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('news').select('*').order('updated_at', { ascending: false })
  const rows = (data ?? []) as NewsRow[]
  const editing = rows.find((n) => n.id === params.editar)
  const categories = Object.entries(NEWS_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
  const badges = Object.entries(BADGE_LABELS).map(([value, label]) => ({ value, label: String(label) }))

  return (
    <PageShell title="Notícias">
      <FlashMessage params={params} />
      {error ? <p role="alert">Não foi possível carregar as notícias.</p> : null}
      <section aria-labelledby="form-noticia" className="mb-10">
        <h2 id="form-noticia" className="mb-4 text-2xl font-bold">
          {editing ? 'Editar notícia' : 'Nova notícia'}
        </h2>
        <form action={formSaveNews} className="max-w-2xl space-y-5" key={editing?.id ?? 'nova'}>
          {editing ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : (
            <Field id="n-slug" label="Identificador (slug)" name="slug" required maxLength={80} hint="Minúsculas, números e hífens. Não pode ser alterado depois." />
          )}
          <Field id="n-title" label="Título" name="title" required maxLength={200} defaultValue={editing?.title} />
          <Field id="n-body" label="Texto" name="body" rows={8} required maxLength={20000} defaultValue={editing?.body} />
          <SelectField id="n-category" label="Categoria" name="category" options={categories} defaultValue={editing?.category} required />
          <SelectField id="n-badge" label="Selo de procedência" name="badge" options={badges} defaultValue={editing?.badge} required />
          <Field id="n-source" label="Link da fonte (opcional)" name="sourceUrl" type="url" maxLength={500} defaultValue={editing?.source_url} />
          <ReasonField id="n-reason" />
          <button type="submit" className={BUTTON}>
            Salvar notícia
          </button>
        </form>
      </section>
      <section aria-labelledby="lista-noticias">
        <h2 id="lista-noticias" className="mb-4 text-2xl font-bold">
          Todas as notícias
        </h2>
        {rows.length === 0 ? <p>Nenhuma notícia cadastrada.</p> : null}
        <ul className="space-y-6">
          {rows.map((n) => (
            <li key={n.id} className="border border-gray-2 p-4">
              <p className="text-sm text-gray-4">{statusLabel(n.status)} · {n.slug}</p>
              <p className="my-1 font-semibold">{n.title}</p>
              <p className="mb-3">
                <a href={`/admin/noticias?editar=${n.id}#form-noticia`} className="underline underline-offset-4">
                  Editar
                </a>
              </p>
              <details>
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">Mudar situação</summary>
                <form action={formNewsStatus} className="mt-3 max-w-xl space-y-4">
                  <input type="hidden" name="id" value={n.id} />
                  <ReasonField id={`nr-${n.id}`} />
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" name="op" value="publish" className={BUTTON}>
                      Publicar
                    </button>
                    <button type="submit" name="op" value="retract" className={BUTTON_SECONDARY}>
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
