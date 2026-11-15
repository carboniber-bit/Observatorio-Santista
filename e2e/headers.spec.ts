import { expect, test } from '@playwright/test'

test('a home envia CSP e HSTS', async ({ request }) => {
  const res = await request.get('/')
  const h = res.headers()
  expect(h['content-security-policy']).toContain("default-src 'self'")
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(h['strict-transport-security']).toContain('max-age=63072000')
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['x-frame-options']).toBe('DENY')
})

test('/sitemap.xml lista as páginas públicas e não lista /admin', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.ok()).toBe(true)
  const xml = await res.text()
  for (const p of ['/votar', '/resultados', '/comparador', '/candidatos/ivan-luduvice', '/sobre', '/metodologia', '/privacidade', '/cookies', '/corrigir']) {
    expect(xml).toContain(`${p}</loc>`)
  }
  expect(xml).not.toContain('/admin')
  expect(xml).not.toContain('/api/')
})

test('/robots.txt bloqueia /admin e aponta o sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.ok()).toBe(true)
  const txt = await res.text()
  expect(txt).toMatch(/Disallow: \/admin/)
  expect(txt).toMatch(/Disallow: \/api\//)
  expect(txt).toMatch(/Sitemap: .*\/sitemap\.xml/)
})
