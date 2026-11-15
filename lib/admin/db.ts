import type { SupabaseClient } from '@supabase/supabase-js'
import { hasPendingQuoteMark, isVerifiedExcerpt } from '../editorial/pending-quote'
import type { AdminDb, InsertTable, UpdateRpc } from './core'

// Adaptador do AdminDb sobre o cliente Supabase da SESSÃO do admin (nunca service
// role): as políticas RLS e as RPCs admin_update_* continuam valendo.
export function makeSupabaseAdminDb(getClient: () => SupabaseClient): AdminDb {
  return {
    async insert(table: InsertTable, row) {
      const { data, error } = await getClient().from(table).insert(row).select('id').single()
      if (error) throw error
      return { id: String((data as { id: string }).id) }
    },
    async update(fn: UpdateRpc, { id, patch, reason, sourceId }) {
      const args: Record<string, unknown> = { p_id: id, p_patch: patch, p_reason: reason }
      // admin_update_source não recebe p_source_id.
      if (fn !== 'admin_update_source') args.p_source_id = sourceId ?? null
      const { error } = await getClient().rpc(fn, args)
      if (error) throw error
    },
    async countSourcesWithExcerpt(proposalId) {
      const { data, error } = await getClient()
        .from('sources')
        .select('excerpt')
        .eq('proposal_id', proposalId)
      if (error) throw error
      return ((data ?? []) as { excerpt: string | null }[]).filter((s) => isVerifiedExcerpt(s.excerpt)).length
    },
    async countPendingQuoteSources(proposalId) {
      const { data, error } = await getClient()
        .from('sources')
        .select('excerpt')
        .eq('proposal_id', proposalId)
      if (error) throw error
      return ((data ?? []) as { excerpt: string | null }[]).filter((s) => hasPendingQuoteMark(s.excerpt)).length
    },
    async markCorrectionHandled(id, handledAtIso) {
      const { data, error } = await getClient()
        .from('correction_requests')
        .update({ status: 'tratada', handled_at: handledAtIso })
        .eq('id', id)
        .select('id')
      if (error) throw error
      return (data ?? []).length
    },
    async currentPublishedAt(table, id) {
      const { data, error } = await getClient().from(table).select('published_at').eq('id', id).maybeSingle()
      if (error) throw error
      return ((data as { published_at: string | null } | null)?.published_at) ?? null
    },
  }
}
