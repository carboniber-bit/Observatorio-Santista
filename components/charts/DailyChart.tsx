'use client'

import { useId } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PatternDefs, patternFill, useChartReady } from './shared'

type Props = {
  data: { day: string; votes: number }[]
  title: string
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' sem passar por Date (evita deslocamento de fuso).
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-')
  return y && m && d ? `${d}/${m}/${y}` : day
}

export function DailyChart({ data, title }: Props) {
  const prefix = `daily${useId().replace(/:/g, '')}`
  const ready = useChartReady()
  const rows = data.map((d) => ({ label: formatDay(d.day), votes: d.votes }))
  const ariaLabel = `${title}. ${rows.map((d) => `${d.label}: ${d.votes} votos`).join('; ')}`

  return (
    <div>
      <PatternDefs prefix={prefix} />
      <div role="img" aria-label={ariaLabel} data-testid="daily-chart" style={{ width: '100%', height: 240 }}>
        {ready && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <XAxis dataKey="label" stroke="#404040" tick={{ fill: '#111111', fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke="#404040" width={40} />
              <Tooltip formatter={(value) => [`${value} votos`, 'Votos']} cursor={{ fill: '#f2f2f2' }} />
              <Bar dataKey="votes" fill={patternFill(prefix, 1)} stroke="#111111" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="pb-2 text-left font-semibold">{title}</caption>
          <thead>
            <tr className="border-b border-gray-3">
              <th scope="col" className="py-2 pr-4">Dia</th>
              <th scope="col" className="py-2 text-right">Votos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.label} className="border-b border-gray-2">
                <th scope="row" className="py-2 pr-4 font-normal">{d.label}</th>
                <td className="py-2 text-right tabular-nums">{d.votes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
