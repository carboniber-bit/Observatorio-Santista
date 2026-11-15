import { PUBLIC_PATHS, SITE_URL, absoluteUrl, candidatePageJsonLd, pageMetadata, safeJsonLd, websiteJsonLd } from './seo'

describe('seo', () => {
  it('SITE_URL é http(s) sem barra final', () => {
    expect(SITE_URL).toMatch(/^https?:\/\/[^/]+$/)
  })

  it('absoluteUrl', () => {
    expect(absoluteUrl('/votar')).toBe(`${SITE_URL}/votar`)
    expect(absoluteUrl('votar')).toBe(`${SITE_URL}/votar`)
    expect(absoluteUrl('/')).toBe(`${SITE_URL}/`)
  })

  it('PUBLIC_PATHS cobre as páginas públicas e nenhuma área restrita', () => {
    for (const p of ['/', '/votar', '/resultados', '/comparador', '/noticias', '/analises', '/historico', '/sobre', '/metodologia', '/privacidade', '/cookies', '/corrigir', '/candidatos/ivan-luduvice', '/candidatos/marcelo-teixeira', '/candidatos/mauricio-maruca', '/candidatos/jose-renato-quaresma']) {
      expect(PUBLIC_PATHS).toContain(p)
    }
    expect(PUBLIC_PATHS).toHaveLength(16)
    expect(PUBLIC_PATHS.some((p) => p.startsWith('/admin') || p.startsWith('/api'))).toBe(false)
  })

  it('pageMetadata traz canonical, openGraph e twitter', () => {
    const m = pageMetadata({ title: 'Votar | X', description: 'Desc', path: '/votar' })
    expect(m.title).toBe('Votar | X')
    expect(m.description).toBe('Desc')
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/votar`)
    expect(m.openGraph).toMatchObject({ type: 'website', locale: 'pt_BR', siteName: 'OBSERVATÓRIO SANTISTA 2026', url: `${SITE_URL}/votar` })
    expect(m.twitter).toMatchObject({ card: 'summary' })
  })

  it('JSON-LD: WebSite e Person só com nome e url', () => {
    expect(websiteJsonLd()).toMatchObject({ '@type': 'WebSite', url: `${SITE_URL}/` })
    const p = candidatePageJsonLd('Ivan Luduvice', 'ivan-luduvice')
    expect(p).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Ivan Luduvice',
      url: `${SITE_URL}/candidatos/ivan-luduvice`,
    })
  })

  it('safeJsonLd escapa < e preserva o conteúdo ao decodificar', () => {
    const payload = { name: '</script><script>alert(1)</script>' }
    const out = safeJsonLd(payload)
    expect(out).not.toContain('<')
    expect(out).toContain('\\u003c/script')
    expect(JSON.parse(out)).toEqual(payload)
  })
})
