import type { Comparison } from '@/lib/editorial/comparison'
import { ProposalItem } from './ProposalItem'

export function ComparatorTable({ comparison }: { comparison: Comparison }) {
  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label="Tabela comparativa de propostas"
      tabIndex={0}
    >
      <table className="w-full min-w-[40rem] border-collapse text-left align-top">
        <caption className="mb-2 text-left text-sm text-gray-4">
          Comparação de propostas verificadas por tema
        </caption>
        <thead>
          <tr>
            <th scope="col" className="border border-gray-3 bg-gray-1 p-3">
              Tema
            </th>
            {comparison.columns.map(({ candidate }) => (
              <th
                key={candidate.id}
                scope="col"
                className="border border-gray-3 bg-gray-1 p-3 font-serif"
              >
                {candidate.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.themes.map((theme, row) => (
            <tr key={theme.id}>
              <th scope="row" className="border border-gray-3 bg-gray-1 p-3 align-top font-semibold">
                {theme.name}
              </th>
              {comparison.columns.map(({ candidate, cells }) => {
                const cell = cells[row]
                return (
                  <td key={candidate.id} className="border border-gray-3 p-3 align-top">
                    {cell.kind === 'proposal' ? (
                      <ul className="space-y-4">
                        {cell.proposals.map((p) => (
                          <li key={p.id}>
                            <ProposalItem proposal={p} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      cell.text
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
