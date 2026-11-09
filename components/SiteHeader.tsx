import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';

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
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-gray-2 bg-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
        <Link href="/" className="font-serif text-lg font-bold tracking-wide text-ink sm:text-xl">
          {BRAND_NAME}
        </Link>
        <nav aria-label="Principal">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="py-1 text-gray-4 underline-offset-4 hover:text-ink hover:underline focus-visible:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
