import Image from 'next/image'
import Link from 'next/link'
import { AccessibilityControls } from '@/components/AccessibilityControls'

const NAV_ITEMS = [
  { label: 'Início', href: '/' },
  { label: 'Candidatos', href: '/#candidatos' },
  { label: 'Comparador', href: '/comparador' },
  { label: 'Votar', href: '/votar' },
  { label: 'Resultados', href: '/resultados' },
  { label: 'Notícias', href: '/noticias' },
  { label: 'Análises', href: '/analises' },
  { label: 'Histórico', href: '/historico' },
  { label: 'Metodologia', href: '/metodologia' },
  { label: 'Sobre', href: '/sobre' },
] as const

export function SiteHeader() {
  return (
    <header className="border-b border-gray-2 bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 text-ink">
            <Image
              src="/brand/emblem.webp"
              alt=""
              width={44}
              height={45}
              priority
              unoptimized
              className="brand-art h-11 w-auto"
            />
            <span className="text-base font-extrabold uppercase leading-tight tracking-wide sm:text-lg">
              Observatório
              <br />
              Santista
            </span>
          </Link>
          <AccessibilityControls />
        </div>
        <nav aria-label="Principal">
          <ul className="flex flex-wrap gap-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-gray-4 hover:bg-gray-1 hover:text-ink focus-visible:bg-gray-1"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
