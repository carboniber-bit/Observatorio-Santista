import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { News } from '@/lib/editorial/content'
import { NewsList } from './NewsList'

afterEach(cleanup)

function news(over: Partial<News> = {}): News {
  return {
    id: 'n1',
    slug: 'n1',
    title: 'Título da notícia',
    body: 'Corpo da notícia',
    category: 'clube',
    badge: 'terceiros',
    source_url: 'https://exemplo.com/materia',
    status: 'publicada',
    published_at: '2026-11-08T15:00:00Z',
    updated_at: '2026-11-08T15:00:00Z',
    ...over,
  }
}

describe('NewsList', () => {
  it('mostra Todas e as 6 categorias com os hrefs certos', () => {
    render(<NewsList items={[]} category={null} />)
    const nav = screen.getByRole('navigation', { name: 'Filtrar notícias por categoria' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Todas', '/noticias'],
      ['Eleição', '/noticias?categoria=eleicao'],
      ['Candidatos', '/noticias?categoria=candidatos'],
      ['Propostas', '/noticias?categoria=propostas'],
      ['Estatuto e regras', '/noticias?categoria=estatuto-e-regras'],
      ['Clube', '/noticias?categoria=clube'],
      ['Plataforma', '/noticias?categoria=plataforma'],
    ])
  })

  it('marca a categoria ativa com aria-current', () => {
    render(<NewsList items={[]} category="clube" />)
    const nav = screen.getByRole('navigation', { name: 'Filtrar notícias por categoria' })
    const current = within(nav).getAllByRole('link', { current: 'page' })
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent('Clube')
  })

  it('marca Todas quando não há categoria', () => {
    render(<NewsList items={[]} category={null} />)
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Todas')
  })

  it('mostra título, selo, categoria, data e fonte segura', () => {
    render(<NewsList items={[news()]} category={null} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Título da notícia' })).toBeInTheDocument()
    expect(screen.getByText('Informação de terceiros')).toBeInTheDocument()
    expect(screen.getByText('08/11/2026')).toBeInTheDocument()
    expect(screen.getByText('Corpo da notícia')).toBeInTheDocument()
    expect(screen.getAllByText('Clube').some((el) => el.tagName === 'SPAN')).toBe(true)
    const fonte = screen.getByRole('link', { name: 'Fonte' })
    expect(fonte).toHaveAttribute('href', 'https://exemplo.com/materia')
    expect(fonte).toHaveAttribute('rel', 'noopener noreferrer')
    expect(fonte).toHaveAttribute('target', '_blank')
  })

  it('não renderiza link para URL insegura', () => {
    render(<NewsList items={[news({ source_url: 'javascript:alert(1)' })]} category={null} />)
    expect(screen.queryByRole('link', { name: 'Fonte' })).toBeNull()
  })

  it('mostra mensagem quando não há notícias', () => {
    render(<NewsList items={[]} category="eleicao" />)
    expect(screen.getByText('Nenhuma notícia publicada nesta categoria ainda.')).toBeInTheDocument()
  })

  it('renderiza HTML do corpo como texto', () => {
    const { container } = render(<NewsList items={[news({ body: '<script>x</script>' })]} category={null} />)
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>x</script>')).toBeInTheDocument()
  })
})
