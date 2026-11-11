'use client'

import { useId } from 'react'
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PatternDefs, Swatch, patternFill, useChartReady, type ChartRow } from './shared'

type Props = {
  data: ChartRow[]
  title: string
  // Quando um dos lados é zero, a pizza some e só a tabela é mostrada.
  hideChart?: boolean
}

export function PieChart({ data, title, hideChart = false }: Props) {
  const prefix = `pie${useId().replace(/:/g, '')}`
  const ready = useChartReady()
  const ariaLabel = `${title}. ${data.map((d) => `${d.label}: ${d.votes} votos`).join('; ')}`

  return (
    <div>
      <PatternDefs prefix={prefix} />
      {!hideChart && (
        <div role="img" aria-label={ariaLabel} data-testid="pie-chart" style={{ width: '100%', height: 260 }}>
          {ready && (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={data}
                  dataKey="votes"
                  nameKey="label"
                  outerRadius="80%"
                  stroke="#111111"
                  isAnimationActive={false}
                >
                  {data.map((d, i) => (
                    <Cell key={d.label} fill={patternFill(prefix, i)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} votos`, String(name)]} />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="pb-2 text-left font-semibold">{title}</caption>
          <thead>
            <tr className="border-b border-gray-3">
              <th scope="col" className="py-2 pr-4">Grupo</th>
              <th scope="col" className="py-2 pr-4 text-right">Votos</th>
              <th scope="col" className="py-2 text-right">Percentual</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={d.label} className="border-b border-gray-2">
                <th scope="row" className="py-2 pr-4 font-normal">
                  <Swatch prefix={prefix} index={i} /> <span className="ml-2">{d.label}</span>
                </th>
                <td className="py-2 pr-4 text-right tabular-nums">{d.votes}</td>
                <td className="py-2 text-right tabular-nums">{d.pct.toLocaleString('pt-BR')}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
