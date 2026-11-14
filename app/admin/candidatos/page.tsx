import { requireAdmin } from '@/lib/admin/auth'
import { formSaveCandidate } from '@/lib/admin/form-actions'
import { CANDIDACY_STATUS_LABELS } from '@/lib/editorial/labels'
import { BUTTON, Field, FlashMessage, PageShell, ReasonField, SelectField, type Flash } from '../_ui'

export const dynamic = 'force-dynamic'

type CandidateRow = {
  id: string
  name: string
  ticket_name: string | null
  vice: string | null
  status: string
  bio: string | null
  club_history: string | null
  trajectory: string | null
  photo_url: string | null
}

export default async function CandidatesAdminPage({ searchParams }: { searchParams: Promise<Flash> }) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('candidates').select('*').order('name')
  const rows = (data ?? []) as CandidateRow[]
  const statuses = Object.entries(CANDIDACY_STATUS_LABELS).map(([value, label]) => ({ value, label }))

  return (
    <PageShell title="Candidatos">
      <FlashMessage params={params} />
      {error ? <p role="alert">Não foi possível carregar os candidatos.</p> : null}
      <p className="mb-6 text-sm text-gray-4">
        Os mesmos campos valem para todos os candidatos. Campo em branco apaga o valor atual.
      </p>
      <ul className="space-y-6">
        {rows.map((c) => (
          <li key={c.id} className="border border-gray-2 p-4">
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold">{c.name}</summary>
              <form action={formSaveCandidate} className="mt-3 max-w-2xl space-y-5">
                <input type="hidden" name="id" value={c.id} />
                <Field id={`c-name-${c.id}`} label="Nome" name="name" required maxLength={200} defaultValue={c.name} />
                <Field id={`c-ticket-${c.id}`} label="Nome da chapa" name="ticketName" maxLength={200} defaultValue={c.ticket_name} />
                <Field id={`c-vice-${c.id}`} label="Vice" name="vice" maxLength={200} defaultValue={c.vice} />
                <SelectField id={`c-status-${c.id}`} label="Situação da candidatura" name="status" options={statuses} defaultValue={c.status} required />
                <Field id={`c-bio-${c.id}`} label="Biografia" name="bio" rows={5} maxLength={10000} defaultValue={c.bio} />
                <Field id={`c-club-${c.id}`} label="Histórico no Santos" name="clubHistory" rows={5} maxLength={10000} defaultValue={c.club_history} />
                <Field id={`c-traj-${c.id}`} label="Trajetória administrativa" name="trajectory" rows={5} maxLength={10000} defaultValue={c.trajectory} />
                <Field id={`c-photo-${c.id}`} label="Link da foto (http ou https)" name="photoUrl" type="url" maxLength={500} defaultValue={c.photo_url} />
                <ReasonField id={`c-reason-${c.id}`} />
                <button type="submit" className={BUTTON}>
                  Salvar candidato
                </button>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </PageShell>
  )
}
