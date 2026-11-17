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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
          <ul className="grid grid-cols-3 gap-2 text-sm sm:flex sm:flex-wrap">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    item.href === '/votar'
                      ? 'inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-center font-bold text-paper hover:opacity-90 sm:w-auto'
                      : 'inline-flex min-h-11 w-full items-center justify-center rounded-full border border-gray-2 px-3 text-center text-gray-4 hover:bg-gray-1 hover:text-ink focus-visible:bg-gray-1 sm:w-auto sm:border-transparent'
                  }
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
