'use client'

import { useId, useState } from 'react'
import { MISSING_FIELD_TEXT } from '@/lib/editorial/comparison'
import { formatDatePtBr, isSafeHttpUrl, sourceKindLabel } from '@/lib/editorial/labels'
import type { Source } from '@/lib/editorial/queries'
import { EditorialText } from '@/lib/editorial/text'

function dateOrMissing(value: string | null): string {
  if (!value) return MISSING_FIELD_TEXT
  return formatDatePtBr(value) || MISSING_FIELD_TEXT
}

function present(value: string | null): string | null {
  return value && value.trim() !== '' ? value : null
}

function SourceDetails({ source }: { source: Source }) {
  const outlet = present(source.outlet)
  const excerpt = present(source.excerpt)
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[11rem_1fr]">
      <dt className="font-semibold">URL</dt>
      <dd className="break-words">
        {isSafeHttpUrl(source.url) ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {source.url}
          </a>
        ) : (
          <span>{source.url}</span>
        )}
      </dd>
      <dt className="font-semibold">Veículo</dt>
      <dd>{outlet ? <EditorialText value={outlet} /> : MISSING_FIELD_TEXT}</dd>
      <dt className="font-semibold">Data da publicação</dt>
      <dd>{dateOrMissing(source.published_on)}</dd>
      <dt className="font-semibold">Data da consulta</dt>
      <dd>{dateOrMissing(source.consulted_on)}</dd>
      <dt className="font-semibold">Tipo</dt>
      <dd>{source.kind ? sourceKindLabel(source.kind) : MISSING_FIELD_TEXT}</dd>
      <dt className="font-semibold">Trecho comprobatório</dt>
      <dd>{excerpt ? <EditorialText value={excerpt} /> : MISSING_FIELD_TEXT}</dd>
    </dl>
  )
}

export function SourcePopover({ sources, label = 'Fonte e verificação' }: { sources: Source[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const rawId = useId()
  const regionId = `fonte-${rawId.replace(/[^A-Za-z0-9_-]/g, '')}`

  if (sources.length === 0) {
    return (
      <p className="inline-flex min-h-11 items-center text-sm text-gray-3" aria-disabled="true">
        Sem fonte cadastrada.
      </p>
    )
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center border border-ink px-4 py-2 text-sm font-semibold underline-offset-4 hover:underline"
      >
        {label}
      </button>
      {open && (
        <div id={regionId} role="region" aria-label={label} className="mt-2 space-y-4 border border-gray-3 bg-gray-1 p-4">
          {sources.map((source) => (
            <SourceDetails key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  )
}
