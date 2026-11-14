import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formLogout } from '@/lib/admin/auth-actions'
import { BUTTON_SECONDARY } from './_ui'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Painel | Observatório Santista',
  robots: { index: false, follow: false, nocache: true },
}

const LINKS = [
  { href: '/admin', label: 'Indicadores' },
  { href: '/admin/propostas', label: 'Propostas' },
  { href: '/admin/fontes', label: 'Fontes' },
  { href: '/admin/noticias', label: 'Notícias' },
  { href: '/admin/analises', label: 'Análises' },
  { href: '/admin/candidatos', label: 'Candidatos' },
  { href: '/admin/correcoes', label: 'Correções' },
] as const

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav aria-label="Painel" className="border-b border-gray-2 bg-gray-1">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-block min-h-11 py-2.5 text-gray-4 underline-offset-4 hover:text-ink hover:underline focus-visible:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <form action={formLogout} className="ml-auto">
            <button type="submit" className={BUTTON_SECONDARY}>
              Sair
            </button>
          </form>
        </div>
      </nav>
      {children}
    </div>
  )
}
