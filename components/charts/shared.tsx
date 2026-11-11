'use client'

import { useEffect, useState } from 'react'

// Mesmos valores de --color-chart-1..4 em app/globals.css (atributos SVG com hex
// evitam depender de variáveis CSS dentro do SVG gerado pelo Recharts).
export const CHART_TONES = ['#111111', '#595959', '#8c8c8c', '#bfbfbf'] as const
// Cor das marcas do padrão sobre cada tom (contraste suficiente em cada fundo).
const MARK_COLORS = ['#ffffff', '#ffffff', '#111111', '#111111'] as const
export const PATTERN_NAMES = ['sólido', 'hachura diagonal', 'pontos', 'hachura cruzada'] as const

export function toneIndex(i: number): number {
  return i % CHART_TONES.length
}

export function patternId(prefix: string, i: number): string {
  return `${prefix}-pat-${toneIndex(i)}`
}

export function patternFill(prefix: string, i: number): string {
  return `url(#${patternId(prefix, i)})`
}

// <pattern> do tom i: cor de fundo mais marcas (sólido, diagonal, pontos, cruzado).
// Vai num <svg> próprio de tamanho zero, no mesmo documento: o gráfico do Recharts e
// as amostras da tabela referenciam os padrões por url(#id), sem depender de o
// Recharts aceitar <defs> como filho.
export function PatternDefs({ prefix }: { prefix: string }) {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
      {CHART_TONES.map((tone, i) => {
        const mark = MARK_COLORS[i]
        return (
          <pattern
            key={i}
            id={patternId(prefix, i)}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <rect width="8" height="8" fill={tone} />
            {i === 1 && <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke={mark} strokeWidth="1.5" />}
            {i === 2 && <circle cx="4" cy="4" r="1.5" fill={mark} />}
            {i === 3 && (
              <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2 M-1,7 l2,2 M0,0 l8,8 M7,-1 l2,2" stroke={mark} strokeWidth="1" />
            )}
          </pattern>
        )
      })}
      </defs>
    </svg>
  )
}

// Amostra de cor/padrão para a tabela (funciona como legenda do gráfico).
export function Swatch({ prefix, index }: { prefix: string; index: number }) {
  return (
    <svg width="16" height="16" aria-hidden="true" focusable="false" className="inline-block align-middle">
      <rect width="16" height="16" fill={patternFill(prefix, index)} stroke="#111111" strokeWidth="1" />
    </svg>
  )
}

// O Recharts (ResponsiveContainer) precisa de ResizeObserver e de largura real.
// Sem isso (SSR, jsdom) o gráfico não é desenhado, mas a tabela equivalente continua.
export function useChartReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof ResizeObserver !== 'undefined') setReady(true)
  }, [])
  return ready
}

export type ChartRow = { label: string; votes: number; pct: number }
