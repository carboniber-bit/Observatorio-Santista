'use client'

import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'
const SIZES = ['base', 'lg', 'xl', 'xxl'] as const
type Size = (typeof SIZES)[number]

const BTN =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gray-2 bg-paper px-3 text-sm font-semibold text-ink hover:bg-gray-1 disabled:opacity-40'

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* sem armazenamento: a escolha vale só nesta página */
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
export function applySize(size: Size) {
  const root = document.documentElement
  if (size === 'base') root.removeAttribute('data-text-size')
  else root.setAttribute('data-text-size', size)
}

export function AccessibilityControls() {
  const [theme, setTheme] = useState<Theme>('system')
  const [size, setSize] = useState<Size>('base')
  const [contrast, setContrast] = useState(false)

  useEffect(() => {
    const t = read('os26_theme')
    if (t === 'light' || t === 'dark') setTheme(t)
    const s = read('os26_size')
    if (s && (SIZES as readonly string[]).includes(s)) setSize(s as Size)
    setContrast(read('os26_contrast') === '1')
  }, [])

  const cycleTheme = () => {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
    applyTheme(next)
    write('os26_theme', next)
  }
  const changeSize = (delta: number) => {
    const i = Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(size) + delta))
    const next = SIZES[i]
    setSize(next)
    applySize(next)
    write('os26_size', next)
  }
  const toggleContrast = () => {
    const next = !contrast
    setContrast(next)
    if (next) document.documentElement.setAttribute('data-contrast', 'high')
    else document.documentElement.removeAttribute('data-contrast')
    write('os26_contrast', next ? '1' : '0')
  }

  const themeLabel = theme === 'system' ? 'Automático' : theme === 'light' ? 'Claro' : 'Escuro'

  return (
    <div role="group" aria-label="Acessibilidade e aparência" className="flex flex-wrap items-center gap-2">
      <button type="button" className={BTN} onClick={() => changeSize(-1)} disabled={size === 'base'} aria-label="Diminuir tamanho do texto">
        A−
      </button>
      <button type="button" className={BTN} onClick={() => changeSize(1)} disabled={size === 'xxl'} aria-label="Aumentar tamanho do texto">
        A+
      </button>
      <button type="button" className={BTN} onClick={cycleTheme} aria-label={`Tema: ${themeLabel}. Alternar entre automático, claro e escuro`}>
        Tema: {themeLabel}
      </button>
      <button type="button" className={BTN} onClick={toggleContrast} aria-pressed={contrast}>
        Alto contraste
      </button>
    </div>
  )
}

/** Script inline (antes da pintura) que restaura as escolhas sem piscar. */
export const THEME_INIT_SCRIPT = `try{var d=document.documentElement,s=localStorage;var t=s.getItem('os26_theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t);var z=s.getItem('os26_size');if(z==='lg'||z==='xl'||z==='xxl')d.setAttribute('data-text-size',z);if(s.getItem('os26_contrast')==='1')d.setAttribute('data-contrast','high')}catch(e){}`
