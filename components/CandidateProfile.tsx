import type { ReactNode } from 'react'
import { MISSING_FIELD_TEXT, MISSING_PROPOSAL_TEXT } from '@/lib/editorial/comparison'
import {
  PROFILE_FIELD_LABELS,
  candidacyStatusLabel,
  formatDatePtBr,
  initials,
  isSafeHttpUrl,
  sourceKindLabel,
} from '@/lib/editorial/labels'
import {
  isPublicStatus,
  type Candidate,
  type ProposalWithSources,
  type Source,
  type Theme,
} from '@/lib/editorial/queries'
import { EditorialText } from '@/lib/editorial/text'
import { ProposalItem } from './ProposalItem'

type Props = { candidate: Candidate; themes: Theme[]; proposals: ProposalWithSources[] }

type SourceEntry = { source: Source; kind: string | null }

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-gray-2 pt-6">
      <h2 data-testid="profile-label" className="mb-3 font-serif text-xl font-bold">
        {label}
      </h2>
      {children}
    </section>
  )
}

function TextField({ value }: { value: string | null }) {
  return (
    <p>{value && value.trim() !== '' ? <EditorialText value={value} /> : MISSING_FIELD_TEXT}</p>
  )
}

function collectSources(proposals: ProposalWithSources[], onlyKinds?: readonly string[]): SourceEntry[] {
  const seen = new Set<string>()
  const out: SourceEntry[] = []
  for (const p of proposals) {
    if (onlyKinds && !onlyKinds.includes(p.source_kind)) continue
    for (const source of p.sources) {
      if (seen.has(source.url)) continue
      seen.add(source.url)
      out.push({ source, kind: source.kind ?? p.source_kind })
    }
  }
  return out
}

function SourceList({ entries, showKind }: { entries: SourceEntry[]; showKind: boolean }) {
  if (entries.length === 0) return <p>{MISSING_FIELD_TEXT}</p>
  return (
    <ul className="space-y-3">
      {entries.map(({ source, kind }) => (
        <li key={source.url} className="text-sm">
          <p className="font-semibold">
            {source.outlet && source.outlet.trim() !== '' ? (
              <EditorialText value={source.outlet} />
            ) : (
              MISSING_FIELD_TEXT
            )}
          </p>
          <p>{source.published_on ? formatDatePtBr(source.published_on) : MISSING_FIELD_TEXT}</p>
          {showKind && <p>{kind ? sourceKindLabel(kind) : MISSING_FIELD_TEXT}</p>}
          <p className="break-words">
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
              source.url
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function CandidateProfile({ candidate, themes, proposals }: Props) {
  const orderedThemes = [...themes].sort((a, b) => a.position - b.position)
  const themeIds = new Set(orderedThemes.map((t) => t.id))
  const shown = proposals.filter((p) => isPublicStatus(p.status) && themeIds.has(p.theme_id))

  const timestamps = [candidate.updated_at, ...shown.map((p) => p.updated_at)]
    .map((v) => ({ v, t: new Date(v).getTime() }))
    .filter((x) => !Number.isNaN(x.t))
  const latest = timestamps.length > 0 ? timestamps.reduce((a, b) => (b.t > a.t ? b : a)).v : null

  const [L_NAME, L_STATUS, L_BIO, L_CLUB, L_TRAJ, L_PROPS, L_INTERVIEWS, L_SOURCES, L_UPDATED] =
    PROFILE_FIELD_LABELS

  return (
    <article className="space-y-8">
      <Section label={L_NAME}>
        <div className="flex items-center gap-4">
          {candidate.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={candidate.photo_url}
              alt={candidate.name}
              className="h-20 w-20 shrink-0 border border-gray-3 object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center border border-gray-3 bg-gray-1 font-serif text-2xl font-bold"
            >
              {initials(candidate.name)}
            </span>
          )}
          <h1 className="font-serif text-3xl font-bold sm:text-4xl">{candidate.name}</h1>
        </div>
      </Section>

      <Section label={L_STATUS}>
        <p>{candidacyStatusLabel(candidate.status)}</p>
      </Section>

      <Section label={L_BIO}>
        <TextField value={candidate.bio} />
      </Section>

      <Section label={L_CLUB}>
        <TextField value={candidate.club_history} />
      </Section>

      <Section label={L_TRAJ}>
        <TextField value={candidate.trajectory} />
      </Section>

      <Section label={L_PROPS}>
        <div className="space-y-6">
          {orderedThemes.map((theme) => {
            const items = shown.filter((p) => p.theme_id === theme.id)
            return (
              <div key={theme.id}>
                <h3 className="mb-2 font-semibold">{theme.name}</h3>
                {items.length === 0 ? (
                  <p>{MISSING_PROPOSAL_TEXT}</p>
                ) : (
                  <ul className="space-y-4">
                    {items.map((p) => (
                      <li key={p.id}>
                        <ProposalItem proposal={p} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section label={L_INTERVIEWS}>
        <SourceList
          entries={collectSources(shown, ['entrevista_direta', 'declaracao_como_presidente'])}
          showKind={false}
        />
      </Section>

      <Section label={L_SOURCES}>
        <SourceList entries={collectSources(shown)} showKind />
      </Section>

      <Section label={L_UPDATED}>
        <p>{latest ? formatDatePtBr(latest) : MISSING_FIELD_TEXT}</p>
      </Section>
    </article>
  )
}
