import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/admin/auth'
import { MfaForm } from './MfaForm'
import { PageShell } from '../_ui'

export const dynamic = 'force-dynamic'

export default async function MfaPage() {
  const supabase = await createAdminClient()
  const { data } = await supabase.auth.getUser()
  if (!data?.user) redirect('/admin/login')
  return (
    <PageShell title="Verificação em duas etapas">
      <MfaForm />
    </PageShell>
  )
}
