import { summarizeChange, type ChangeLogEntry } from '@/lib/editorial/changelog'
import { formatDateTimePtBr, isSafeHttpUrl } from '@/lib/editorial/labels'
import { EditorialText } from '@/lib/editorial/text'

const KIND_LABELS = { retirada: 'Retirada', publicacao: 'Publicação', edicao: 'Edição' } as const

export function ChangeLogList({ entries }: { entries: ChangeLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="border border-gray-3 bg-gray-1 p-4">Ainda não há atualizações registradas.</p>
    )
  }
  return (
    <ol className="space-y-6">
      {entries.map((entry) => {
        const s = summarizeChange(entry)
        const changed = s.changedFields.join(', ')
        return (
          <li key={entry.id} className="space-y-2 border-t border-gray-3 pt-4">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <time dateTime={entry.changedAt} className="text-gray-4">
                {formatDateTimePtBr(entry.changedAt)}
              </time>
              <span className="font-semibold">{s.tableLabel}</span>
              <span className="border border-ink px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                {KIND_LABELS[s.kind]}
              </span>
            </p>
            <p>
              <span className="font-semibold">Motivo:</span> <EditorialText value={entry.reason} />
            </p>
            {changed ? (
              <p>
                <span className="font-semibold">Alterado:</span> {changed}
              </p>
            ) : null}
            {s.statusChange ? (
              <p>
                Situação: {s.statusChange.from || '—'} → {s.statusChange.to || '—'}
              </p>
            ) : null}
            <p>
              {entry.sourceUrl && isSafeHttpUrl(entry.sourceUrl) ? (
                <a
                  href={entry.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Fonte
                </a>
              ) : (
                'Sem fonte vinculada.'
              )}
            </p>
            <p className="text-sm text-gray-4">Registrado por: {entry.author}</p>
          </li>
        )
      })}
    </ol>
  )
}
