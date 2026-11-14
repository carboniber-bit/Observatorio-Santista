import { requireAdmin } from '@/lib/admin/auth'
import { formHandleCorrection } from '@/lib/admin/form-actions'
import { formatDatePtBr } from '@/lib/editorial/labels'
import { BUTTON, FlashMessage, PageShell, ReasonField, statusLabel, type Flash } from '../_ui'

export const dynamic = 'force-dynamic'

type CorrectionRow = {
  id: string
  body: string
  link: string | null
  email: string | null
  status: string
  created_at: string
}

export default async function CorrectionsAdminPage({ searchParams }: { searchParams: Promise<Flash> }) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('correction_requests')
    .select('id, body, link, email, status, created_at')
    .is('handled_at', null)
    .order('created_at', { ascending: true })
  const rows = (data ?? []) as CorrectionRow[]

  return (
    <PageShell title="Pedidos de correção">
      <FlashMessage params={params} />
      {error ? <p role="alert">Não foi possível carregar os pedidos.</p> : null}
      {rows.length === 0 && !error ? <p>Nenhum pedido em aberto.</p> : null}
      <ul className="space-y-6">
        {rows.map((r) => (
          <li key={r.id} className="border border-gray-2 p-4">
            <p className="text-sm text-gray-4">
              {statusLabel(r.status)} · recebido em {formatDatePtBr(r.created_at)}
            </p>
            <p className="my-2 whitespace-pre-wrap">{r.body}</p>
            {r.link && /^https?:\/\//i.test(r.link) ? (
              <p className="break-all text-sm">
                Link:{' '}
                <a href={r.link} rel="noopener noreferrer nofollow" target="_blank" className="underline underline-offset-4">
                  {r.link}
                </a>
              </p>
            ) : null}
            {r.email ? <p className="text-sm">E-mail: {r.email}</p> : null}
            <form action={formHandleCorrection} className="mt-4 max-w-xl space-y-4">
              <input type="hidden" name="id" value={r.id} />
              <ReasonField id={`cr-${r.id}`} />
              <button type="submit" className={BUTTON}>
                Marcar como tratado
              </button>
            </form>
          </li>
        ))}
      </ul>
    </PageShell>
  )
}
