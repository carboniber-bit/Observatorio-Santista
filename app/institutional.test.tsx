import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeView, type HomeViewProps } from '@/components/HomeView'
import type { Candidate } from '@/lib/editorial/queries'
import type { ResultsSummary } from '@/lib/results'
import CookiesPage from './cookies/page'
import MetodologiaPage from './metodologia/page'
import PrivacidadePage from './privacidade/page'
import SobrePage from './sobre/page'

const mk = (id: string, slug: string, name: string) => ({ id, slug, name }) as unknown as Candidate
// Já em ordem alfabética (como getCandidates entrega).
const candidates = [
  mk('c1', 'ivan-luduvice', 'Ivan Luduvice'),
  mk('c2', 'jose-renato-quaresma', 'José Renato Quaresma'),
  mk('c3', 'marcelo-teixeira', 'Marcelo Teixeira'),
  mk('c4', 'mauricio-maruca', 'Maurício Maruca'),
]

const zero: ResultsSummary = {
  total: 0,
  byCandidate: [
    ...candidates.map((c) => ({ candidateId: c.id, votes: 0, pct: 0 })),
    { candidateId: null, votes: 0, pct: 0 },
  ],
  discarded: 0,
  lastUpdated: null,
}
const withVotes: ResultsSummary = {
  total: 10,
  byCandidate: [
    { candidateId: 'c3', votes: 5, pct: 50 },
    { candidateId: 'c1', votes: 2, pct: 20 },
    { candidateId: 'c2', votes: 1, pct: 10 },
    { candidateId: 'c4', votes: 1, pct: 10 },
    { candidateId: null, votes: 1, pct: 10 },
  ],
  discarded: 0,
  lastUpdated: null,
}

const base = (summary: ResultsSummary | null): HomeViewProps => ({
  summary,
  candidates,
  news: [],
  proposals: [],
})

const FORBIDDEN = /melhor candidato|mais preparado|mais promissor/i

describe('home', () => {
  it('mostra título, subtítulo e apresentação exatos', () => {
    render(<HomeView {...base(zero)} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('ELEIÇÃO SANTOS 2026')
    expect(screen.getByText('O futuro do Santos em debate. Informação, propostas e participação da torcida.')).toBeTruthy()
    expect(
      screen.getByText(
        'Um observatório independente criado para acompanhar a eleição presidencial do Santos Futebol Clube em 2026. Conheça os candidatos, compare propostas verificadas, acompanhe a disputa e participe da nossa simulação de intenção de voto.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Participe da simulação' }).getAttribute('href')).toBe('/votar')
    expect(screen.getByRole('link', { name: 'Ver resultados' }).getAttribute('href')).toBe('/resultados')
  })

  it('com zero votos não mostra percentual nem NaN', () => {
    const { container } = render(<HomeView {...base(zero)} />)
    expect(screen.getByText('a simulação ainda não possui participantes')).toBeTruthy()
    expect(container.textContent).not.toContain('%')
    expect(container.textContent).not.toContain('NaN')
  })

  it('com votos mostra percentual dos 4 candidatos em ordem alfabética e mesmas classes', () => {
    const { container } = render(<HomeView {...base(withVotes)} />)
    const section = container.querySelector('section[aria-labelledby="simulacao"]') as HTMLElement
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items.map((li) => li.querySelector('p')?.textContent)).toEqual(
      candidates.map((c) => c.name),
    )
    expect(items.map((li) => li.textContent)).toEqual([
      'Ivan Luduvice20,0%',
      'José Renato Quaresma10,0%',
      'Marcelo Teixeira50,0%',
      'Maurício Maruca10,0%',
    ])
    expect(new Set(items.map((li) => li.className)).size).toBe(1)
    expect(new Set(items.map((li) => li.querySelector('p')?.className)).size).toBe(1)
    expect(container.textContent).not.toContain('NaN')
  })

  it('links de acesso rápido para os 4 candidatos e comparador', () => {
    render(<HomeView {...base(zero)} />)
    for (const c of candidates) {
      expect(screen.getByRole('link', { name: c.name }).getAttribute('href')).toBe(`/candidatos/${c.slug}`)
    }
    expect(screen.getByRole('link', { name: /Comparar propostas/ }).getAttribute('href')).toBe('/comparador')
  })

  it('cada seção falha com mensagem amigável sem derrubar a home', () => {
    render(<HomeView summary={null} candidates={null} news={null} proposals={null} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('ELEIÇÃO SANTOS 2026')
    expect(screen.getAllByRole('alert')).toHaveLength(4)
  })

  it('renderiza propostas e notícias com nome do candidato', () => {
    const props = {
      ...base(zero),
      news: [{ id: 'n1', title: 'Título da notícia', published_at: '2026-11-01T12:00:00Z' }],
      proposals: [{ candidateName: 'Ivan Luduvice', proposal: { id: 'p1', description: 'Texto da proposta' } }],
    } as unknown as HomeViewProps
    render(<HomeView {...props} />)
    expect(screen.getByText('Título da notícia')).toBeTruthy()
    expect(screen.getByText('Texto da proposta')).toBeTruthy()
    expect(screen.getAllByText('Ivan Luduvice').length).toBeGreaterThan(0)
  })
})

describe('sobre', () => {
  it('três parágrafos exatos, em ordem', () => {
    const { container } = render(<SobrePage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sobre o Observatório')
    const ps = Array.from(container.querySelectorAll('main > div > p')).map((p) => p.textContent)
    expect(ps).toEqual([
      'Este é um projeto independente, sem vínculo oficial com o Santos Futebol Clube, seus conselheiros, candidatos ou chapas. Seu objetivo é reunir informações públicas e verificáveis sobre a eleição presidencial de 2026 e oferecer uma simulação informal de intenção de voto entre os participantes da plataforma.',
      'A votação não é oficial, não substitui o processo eleitoral do clube e não representa necessariamente a opinião de todos os torcedores ou associados.',
      'As informações são apresentadas com o compromisso de imparcialidade, transparência e respeito aos envolvidos.',
    ])
    for (const href of ['/metodologia', '/privacidade', '/corrigir']) {
      expect(container.querySelector(`a[href="${href}"]`)).not.toBeNull()
    }
  })
})

describe('metodologia', () => {
  it('tem as 4 seções e as strings exigidas', () => {
    const { container } = render(<MetodologiaPage />)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Critérios editoriais',
      'Metodologia da simulação',
      'Limitações da pesquisa',
      'Privacidade e proteção de dados',
    ])
    const text = container.textContent ?? ''
    for (const s of ['5 votos por hora', '7 dias', '90 dias', '11/12/2026', 'autodeclar', 'votação espontânea, não é pesquisa científica']) {
      expect(text).toContain(s)
    }
  })
})

describe('privacidade', () => {
  it('traz as seções e prazos', () => {
    const { container } = render(<PrivacidadePage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Política de Privacidade')
    const text = container.textContent ?? ''
    for (const s of ['Controlador', 'Turnstile', '7 dias', '90 dias', 'LGPD']) expect(text).toContain(s)
    expect(container.querySelector('a[href="/cookies"]')).not.toBeNull()
    expect(text).toContain('mantidos de forma anônima')
    expect(text).not.toContain('agregada')
    expect(text).toContain('nunca o valor bruto')
    expect(text).toContain('não é apagado pela rotina de 7 dias')
    expect(text).toContain('hash temporário do remetente')
  })

  it('sem NEXT_PUBLIC_CONTACT_EMAIL aponta para /corrigir', () => {
    const prev = process.env.NEXT_PUBLIC_CONTACT_EMAIL
    delete process.env.NEXT_PUBLIC_CONTACT_EMAIL
    try {
      const { container } = render(<PrivacidadePage />)
      expect(container.querySelector('a[href="/corrigir"]')).not.toBeNull()
    } finally {
      if (prev !== undefined) process.env.NEXT_PUBLIC_CONTACT_EMAIL = prev
    }
  })
})

describe('cookies', () => {
  it('lista só o cookie essencial os26_voter', () => {
    const { container } = render(<CookiesPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Cookies')
    const rows = container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('os26_voter')
    expect(container.textContent).toContain('guardada apenas na URL (parâmetro ?filtro=), não é cookie')
  })
})

describe('regras globais', () => {
  it('nenhuma página usa frases proibidas', () => {
    const views = [
      render(<HomeView {...base(withVotes)} />),
      render(<SobrePage />),
      render(<MetodologiaPage />),
      render(<PrivacidadePage />),
      render(<CookiesPage />),
    ]
    for (const v of views) expect(v.container.textContent).not.toMatch(FORBIDDEN)
  })

  // Atualizado na T14: o único uso permitido é components/JsonLd.tsx (JSON-LD com "<" escapado).
  it('nenhum arquivo usa dangerouslySetInnerHTML, salvo components/JsonLd.tsx', () => {
    const root = path.resolve(__dirname, '..')
    expect(readFileSync(path.join(root, 'components/JsonLd.tsx'), 'utf8')).toContain('safeJsonLd')
    const files = [
      'app/page.tsx',
      'components/HomeView.tsx',
      'app/sobre/page.tsx',
      'app/metodologia/page.tsx',
      'app/privacidade/page.tsx',
      'app/cookies/page.tsx',
      'app/candidatos/[slug]/page.tsx',
    ]
    for (const f of files) expect(readFileSync(path.join(root, f), 'utf8')).not.toContain('dangerouslySetInnerHTML')
  })
})
