import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = ['/', '/votar', '/resultados', '/comparador', '/candidatos/ivan-luduvice']

test.describe('acessibilidade (axe)', () => {
  for (const path of PAGES) {
    test(`sem violações sérias ou críticas em ${path}`, async ({ page }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([])
    })
  }
})

test.describe('sem rolagem horizontal', () => {
  for (const width of [375, 768, 1280]) {
    for (const path of PAGES) {
      test(`${path} em ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(path)
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        expect(fits).toBe(true)
      })
    }
  }
})

test.describe('teclado em /votar', () => {
  test('Tab até "Sim", seleciona com o teclado e escolhe um candidato', async ({ page }) => {
    await page.goto('/votar')
    const sim = page.getByRole('radio', { name: 'Sim' })
    // Fora do período de votação a página mostra um aviso no lugar do formulário.
    test.skip((await sim.count()) === 0, 'votação fechada ou sem candidatos: formulário ausente')

    for (let i = 0; i < 40; i++) {
      if (await sim.evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(sim).toBeFocused()
    await page.keyboard.press('Space')
    await expect(sim).toBeChecked()

    // O grupo de candidatos aparece após responder a pergunta de sócio.
    const candidates = page.getByRole('group', { name: 'Em quem você votaria?' }).getByRole('radio')
    await expect(candidates.first()).toBeVisible()
    for (let i = 0; i < 20; i++) {
      if (await candidates.first().evaluate((el) => el === document.activeElement)) break
      await page.keyboard.press('Tab')
    }
    await expect(candidates.first()).toBeFocused()
    await page.keyboard.press('Space')
    await expect(candidates.first()).toBeChecked()

    // O envio exige o Turnstile (desafio externo). Sem chave de teste configurada, o botão fica
    // desabilitado e esta etapa não é automatizável: registrada, não escondida.
    test.info().annotations.push({
      type: 'pendente',
      description: 'Envio do voto por teclado não coberto: depende do Turnstile (use a chave de teste da Cloudflare para cobrir).',
    })
    await expect(page.getByRole('button', { name: 'Registrar voto' })).toBeVisible()
  })
})
