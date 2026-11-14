import { test, expect } from '@playwright/test'

// Esqueleto e2e do painel. Rodar com o site no ar:
//   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/admin.spec.ts
// Sem E2E_BASE_URL os testes são pulados. O vitest ignora e2e/** (vitest.config.ts).
const baseURL = process.env.E2E_BASE_URL

test.describe('painel /admin', () => {
  test.skip(!baseURL, 'defina E2E_BASE_URL para rodar o e2e')

  test('sem sessão, /admin redireciona para /admin/login', async ({ page }) => {
    await page.goto(`${baseURL}/admin`)
    await expect(page).toHaveURL(/\/admin\/login$/)
    await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible()
  })

  test('subpáginas também exigem login', async ({ page }) => {
    for (const path of ['/admin/propostas', '/admin/correcoes', '/admin/candidatos']) {
      await page.goto(`${baseURL}${path}`)
      await expect(page).toHaveURL(/\/admin\/login$/)
    }
  })

  test('a resposta do painel não é cacheável nem indexável', async ({ request }) => {
    const res = await request.get(`${baseURL}/admin/login`)
    expect(res.headers()['cache-control']).toContain('no-store')
    expect(res.headers()['x-robots-tag']).toContain('noindex')
  })

  test('a tela de login não tem controles de edição de votos', async ({ page }) => {
    await page.goto(`${baseURL}/admin/login`)
    const html = (await page.content()).toLowerCase()
    expect(html).not.toMatch(/vote_events|voter_tokens|vote_hashes/)
    await expect(page.getByRole('button', { name: /apagar voto|editar voto|excluir voto/i })).toHaveCount(0)
  })
})
