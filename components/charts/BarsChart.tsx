'use client'

import { useId } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PatternDefs, Swatch, patternFill, useChartReady, type ChartRow } from './shared'

type Props = {
  data: ChartRow[]
  title: string
}

export function BarsChart({ data, title }: Props) {
  const prefix = `bars${useId().replace(/:/g, '')}`
  const ready = useChartReady()
  const ariaLabel = `${title}. ${data.map((d) => `${d.label}: ${d.votes} votos`).join('; ')}`
  const height = Math.max(160, data.length * 48 + 40)

  return (
    <div>
      <PatternDefs prefix={prefix} />
      <div role="img" aria-label={ariaLabel} data-testid="bars-chart" style={{ width: '100%', height }}>
        {ready && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
              <XAxis type="number" allowDecimals={false} stroke="#404040" />
              <YAxis type="category" dataKey="label" width={130} stroke="#404040" tick={{ fill: '#111111', fontSize: 13 }} />
              <Tooltip formatter={(value) => [`${value} votos`, 'Votos']} cursor={{ fill: '#f2f2f2' }} />
              <Bar dataKey="votes" stroke="#111111" isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={d.label} fill={patternFill(prefix, i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="pb-2 text-left font-semibold">{title}</caption>
          <thead>
            <tr className="border-b border-gray-3">
              <th scope="col" className="py-2 pr-4">Candidato</th>
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
