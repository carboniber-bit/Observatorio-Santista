import Link from 'next/link'
import type { News } from '@/lib/editorial/content'
import {
  NEWS_CATEGORIES,
  NEWS_CATEGORY_LABELS,
  formatDatePtBr,
  isBadge,
  isSafeHttpUrl,
  type NewsCategory,
} from '@/lib/editorial/labels'
import { EditorialText } from '@/lib/editorial/text'
import { ProvenanceBadge } from './ProvenanceBadge'

type Props = { items: News[]; category: NewsCategory | null }

function categoryLabel(value: string): string {
  return Object.prototype.hasOwnProperty.call(NEWS_CATEGORY_LABELS, value)
    ? NEWS_CATEGORY_LABELS[value as NewsCategory]
    : value
}

const FILTERS: { label: string; href: string; value: NewsCategory | null }[] = [
  { label: 'Todas', href: '/noticias', value: null },
  ...NEWS_CATEGORIES.map((slug) => ({
    label: NEWS_CATEGORY_LABELS[slug],
    href: `/noticias?categoria=${slug}`,
    value: slug as NewsCategory | null,
  })),
]

export function NewsList({ items, category }: Props) {
  return (
    <div className="space-y-8">
      <nav aria-label="Filtrar notícias por categoria">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = f.value === category
            return (
              <li key={f.href}>
                <Link
                  href={f.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'inline-block border border-ink bg-ink px-3 py-1.5 text-sm font-semibold text-paper'
                      : 'inline-block border border-gray-3 px-3 py-1.5 text-sm text-ink underline-offset-4 hover:underline'
                  }
                >
                  {f.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {items.length === 0 ? (
        <p className="border border-gray-3 bg-gray-1 p-4">
          Nenhuma notícia publicada nesta categoria ainda.
        </p>
      ) : (
        <ol className="space-y-8">
          {items.map((item) => (
            <li key={item.id} className="border-t border-gray-3 pt-6">
              <article className="space-y-3">
                <h2 className="font-serif text-xl font-bold">
                  <EditorialText value={item.title} />
                </h2>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-4">
                  {isBadge(item.badge) ? <ProvenanceBadge badge={item.badge} /> : null}
                  <span>{categoryLabel(item.category)}</span>
                  {item.published_at ? <span>{formatDatePtBr(item.published_at)}</span> : null}
                </p>
                <p>
                  <EditorialText value={item.body} />
                </p>
                {item.source_url && isSafeHttpUrl(item.source_url) ? (
                  <p>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      Fonte
                    </a>
                  </p>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
