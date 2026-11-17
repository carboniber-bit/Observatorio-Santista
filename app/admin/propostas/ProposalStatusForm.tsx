import { BUTTON, BUTTON_SECONDARY, FIELD, ReasonField } from '../_ui'

type StatusAction = (formData: FormData) => void | Promise<void>

// Um único formulário por proposta: um campo de motivo e um de fonte, compartilhados pelas três ações.
// Cada botão tem a sua própria Server Action (formAction), então a operação nunca depende do FormData.
export function ProposalStatusForm({
  proposalId,
  sources,
  publishAction,
  correctAction,
  retractAction,
}: {
  proposalId: string
  sources: { id: string; url: string }[]
  publishAction: StatusAction
  correctAction: StatusAction
  retractAction: StatusAction
}) {
  return (
    <form className="mt-3 max-w-xl space-y-4" aria-label="Mudar situação da proposta">
      <input type="hidden" name="id" value={proposalId} />
      <ReasonField id={`r-${proposalId}`} />
      {sources.length > 0 ? (
        <div>
          <label htmlFor={`s-${proposalId}`} className="mb-1 block font-semibold">
            Fonte que fundamenta a mudança (opcional)
          </label>
          <select id={`s-${proposalId}`} name="sourceId" defaultValue="" className={FIELD}>
            <option value="">Nenhuma</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.url}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" formAction={publishAction} className={BUTTON}>
          Publicar
        </button>
        <button type="submit" formAction={correctAction} className={BUTTON_SECONDARY}>
          Marcar como corrigida
        </button>
        <button type="submit" formAction={retractAction} className={BUTTON_SECONDARY}>
          Retirar
        </button>
      </div>
    </form>
  )
}
