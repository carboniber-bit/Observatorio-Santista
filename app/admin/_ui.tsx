import type { ReactNode } from 'react'

export const FIELD =
  'block min-h-11 w-full border border-gray-3 bg-paper px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
export const LABEL = 'mb-1 block font-semibold'
export const BUTTON =
  'min-h-11 border border-ink bg-ink px-5 py-2 font-semibold text-paper hover:bg-gray-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
export const BUTTON_SECONDARY =
  'min-h-11 border border-ink bg-paper px-5 py-2 font-semibold text-ink hover:bg-gray-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

export type Flash = { ok?: string | string[]; erro?: string | string[] }

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s ? s.slice(0, 300) : undefined
}

// Mensagem de retorno das ações (?ok= / ?erro=). Renderizada como texto, nunca como HTML.
export function FlashMessage({ params }: { params: Flash }) {
  const ok = first(params.ok)
  const erro = first(params.erro)
  if (!ok && !erro) return null
  return erro ? (
    <p role="alert" className="mb-6 border-2 border-ink bg-gray-1 p-3 font-semibold">
      {erro}
    </p>
  ) : (
    <p role="status" className="mb-6 border border-ink bg-gray-1 p-3 font-semibold">
      {ok}
    </p>
  )
}

export function Field(props: {
  id: string
  label: string
  name: string
  defaultValue?: string | number | null
  type?: string
  required?: boolean
  maxLength?: number
  rows?: number
  hint?: string
}) {
  const { id, label, name, defaultValue, type = 'text', required, maxLength, rows, hint } = props
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {rows ? (
        <textarea
          id={id}
          name={name}
          rows={rows}
          required={required}
          maxLength={maxLength}
          defaultValue={defaultValue ?? ''}
          aria-describedby={hintId}
          className={FIELD}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          defaultValue={defaultValue ?? ''}
          aria-describedby={hintId}
          className={FIELD}
        />
      )}
      {hint ? (
        <p id={hintId} className="mt-1 text-sm text-gray-4">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function SelectField(props: {
  id: string
  label: string
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string
  required?: boolean
}) {
  const { id, label, name, options, defaultValue, required } = props
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue ?? ''} required={required} className={FIELD}>
        <option value="" disabled>
          Selecione
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Todo envio de edição exige motivo (mínimo de 3 caracteres): vira o histórico público.
export function ReasonField({ id }: { id: string }) {
  return (
    <Field
      id={id}
      label="Motivo da alteração"
      name="reason"
      required
      maxLength={500}
      hint="Obrigatório. Fica registrado no histórico de alterações."
    />
  )
}

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">{title}</h1>
      {children}
    </main>
  )
}

export const STATUS_LABEL: Record<string, string> = {
  em_revisao: 'Em revisão',
  publicada: 'Publicada',
  corrigida: 'Corrigida',
  retirada: 'Retirada',
  rascunho: 'Rascunho',
  nova: 'Nova',
  em_tratamento: 'Em tratamento',
  tratada: 'Tratada',
  rejeitada: 'Rejeitada',
}
export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s

export function relationName(rel: unknown): string {
  const r = Array.isArray(rel) ? rel[0] : rel
  return r && typeof r === 'object' && 'name' in r ? String((r as { name: unknown }).name) : '—'
}
