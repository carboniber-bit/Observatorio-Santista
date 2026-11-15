import robots from './robots'
import sitemap from './sitemap'
import { PUBLIC_PATHS, SITE_URL } from '@/lib/seo'

describe('sitemap', () => {
  it('lista as páginas públicas com URL absoluta, sem /admin nem /api', () => {
    const urls = sitemap().map((e) => e.url)
    expect(urls).toHaveLength(PUBLIC_PATHS.length)
    expect(urls).toContain(`${SITE_URL}/votar`)
    expect(urls).toContain(`${SITE_URL}/candidatos/ivan-luduvice`)
    for (const u of urls) {
      expect(u.startsWith(SITE_URL)).toBe(true)
      expect(u).not.toMatch(/\/(admin|api)(\/|$)/)
    }
  })
})

describe('robots', () => {
  it('permite / e bloqueia /admin e /api/, com sitemap', () => {
    const r = robots()
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules
    expect(rule.allow).toBe('/')
    expect(rule.disallow).toEqual(['/admin', '/api/'])
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })
})
