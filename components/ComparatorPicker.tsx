import type { Candidate } from '@/lib/editorial/queries'

type Props = { candidates: Candidate[]; selected: string[] }

export function ComparatorPicker({ candidates, selected }: Props) {
  return (
    <form method="get" action="/comparador" className="space-y-4">
      <fieldset className="border border-gray-3 p-4">
        <legend className="px-2 font-semibold">Candidatos a comparar</legend>
        <ul className="space-y-1">
          {candidates.map((c) => (
            <li key={c.id}>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  name="c"
                  value={c.slug}
                  defaultChecked={selected.includes(c.slug)}
                  className="h-5 w-5"
                />
                <span>{c.name}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center border border-ink bg-ink px-5 py-2 font-semibold text-paper underline-offset-4 hover:underline"
      >
        Comparar
      </button>
    </form>
  )
}
