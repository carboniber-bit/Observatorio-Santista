import { expect, test, type Page } from '@playwright/test'

// Auditoria de neutralidade, fontes e fluxo completo de votação.
//
// Escrito para um site no ar com o Supabase semeado (supabase/seed.sql: 4 candidatos, 9 temas).
// Sem NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no ambiente do processo de teste,
// tudo é PULADO (e o motivo aparece na lista). Como rodar: README.md, seção "Auditoria de neutralidade".
//
// O teste de votação grava um voto REAL: use somente um projeto Supabase de teste e as chaves de
// teste do Turnstile da Cloudflare (ver docs/deploy.md, seção "Testes ponta a ponta").

const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const SKIP_NO_SUPABASE =
  'defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (projeto Supabase de teste, com supabase/seed.sql aplicado)'

// Chaves de teste documentadas pela Cloudflare: sempre aprovam. Nunca use em produção.
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA'
const hasTurnstileTestKeys =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === TURNSTILE_TEST_SITE_KEY &&
  process.env.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRET
const SKIP_NO_TURNSTILE = `defina NEXT_PUBLIC_TURNSTILE_SITE_KEY=${TURNSTILE_TEST_SITE_KEY} e TURNSTILE_SECRET_KEY=${TURNSTILE_TEST_SECRET} antes de compilar e iniciar o site`

const CANDIDATE_SLUGS = ['marcelo-teixeira', 'mauricio-maruca', 'jose-renato-quaresma', 'ivan-luduvice']

// Mesma lista, na mesma ordem, de PROFILE_FIELD_LABELS (lib/editorial/labels.ts).
const EXPECTED_PROFILE_LABELS = [
  'Nome',
  'Situação da candidatura',
  'Biografia',
  'Histórico no Santos',
  'Trajetória administrativa',
  'Propostas por tema',
  'Entrevistas e declarações',
  'Fontes e referências',
  'Data da última atualização',
]

const PUBLIC_PAGES = [
  '/',
  ...CANDIDATE_SLUGS.map((s) => `/candidatos/${s}`),
  '/comparador',
  '/noticias',
  '/analises',
  '/historico',
  '/sobre',
  '/metodologia',
  '/privacidade',
  '/cookies',
  '/votar',
  '/resultados',
  '/corrigir',
]

// Expressões proibidas (lib/editorial/neutrality.ts), com radicais para pegar flexões.
const FORBIDDEN = /melhor(es)?\s+candidat|mais\s+preparad|mais\s+promissor/i

async function visibleText(page: Page): Promise<string> {
  return page.locator('body').innerText()
}

test.describe('neutralidade e fontes (site semeado)', () => {
  test.skip(!hasSupabase, SKIP_NO_SUPABASE)

  test('os 4 perfis têm as mesmas seções, com os mesmos rótulos e na mesma ordem', async ({ page }) => {
    const labelsBySlug: Record<string, string[]> = {}
    for (const slug of CANDIDATE_SLUGS) {
      await page.goto(`/candidatos/${slug}`)
      const labels = (await page.locator('[data-testid="profile-label"]').allTextContents()).map((t) => t.trim())
      labelsBySlug[slug] = labels
      expect(labels.length, `número de seções em ${slug}`).toBe(EXPECTED_PROFILE_LABELS.length)
    }
    for (const slug of CANDIDATE_SLUGS) {
      expect(labelsBySlug[slug], `rótulos em ${slug}`).toEqual(EXPECTED_PROFILE_LABELS)
      expect(labelsBySlug[slug], `rótulos de ${slug} iguais aos de ${CANDIDATE_SLUGS[0]}`).toEqual(
        labelsBySlug[CANDIDATE_SLUGS[0]],
      )
    }
  })

  test('os 4 perfis listam os mesmos temas, na mesma ordem', async ({ page }) => {
    const themesBySlug: Record<string, string[]> = {}
    for (const slug of CANDIDATE_SLUGS) {
      await page.goto(`/candidatos/${slug}`)
      const section = page.locator('section', {
        has: page.locator('[data-testid="profile-label"]', { hasText: 'Propostas por tema' }),
      })
      themesBySlug[slug] = (await section.locator('h3').allTextContents()).map((t) => t.trim())
      expect(themesBySlug[slug].length, `temas em ${slug}`).toBe(9)
    }
    for (const slug of CANDIDATE_SLUGS) {
      expect(themesBySlug[slug]).toEqual(themesBySlug[CANDIDATE_SLUGS[0]])
    }
  })

  test('nenhuma página pública contém expressões que ranqueiam candidatos', async ({ page }) => {
    const pages = [...PUBLIC_PAGES]
    // Páginas de análise individuais, descobertas pela listagem.
    await page.goto('/analises')
    const hrefs = await page.locator('a[href^="/analises/"]').evaluateAll((els) =>
      els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''),
    )
    for (const href of new Set(hrefs)) pages.push(href)

    const offenders: string[] = []
    for (const path of pages) {
      const res = await page.goto(path)
      expect(res?.ok(), `${path} respondeu com erro`).toBe(true)
      const match = (await visibleText(page)).match(FORBIDDEN)
      if (match) offenders.push(`${path}: "${match[0]}"`)
    }
    expect(offenders).toEqual([])
  })

  test('todo item de proposta publicado tem o botão "Fonte e verificação"', async ({ page }) => {
    let totalItems = 0
    for (const slug of CANDIDATE_SLUGS) {
      await page.goto(`/candidatos/${slug}`)
      const section = page.locator('section', {
        has: page.locator('[data-testid="profile-label"]', { hasText: 'Propostas por tema' }),
      })
      // Cada <li> dessa seção é uma proposta publicada (temas vazios mostram só um parágrafo).
      const items = section.locator('li')
      const count = await items.count()
      totalItems += count
      for (let i = 0; i < count; i++) {
        await expect(
          items.nth(i).getByRole('button', { name: 'Fonte e verificação' }),
          `${slug}: proposta ${i + 1} sem botão de fonte`,
        ).toHaveCount(1)
      }
    }
    // Conteúdo ainda vazio (T15): não é falha, mas fica registrado e visível no relatório.
    if (totalItems === 0) {
      test.info().annotations.push({
        type: 'sem-conteudo',
        description: 'Nenhuma proposta publicada ainda: a verificação de fontes não exerceu nenhum item.',
      })
    }
  })

  test('/historico carrega e não expõe e-mail de autor', async ({ page }) => {
    await page.goto('/historico')
    await expect(page.getByRole('heading', { level: 1, name: 'Histórico de atualizações' })).toBeVisible()
    const mainText = await page.locator('main').innerText()
    expect(mainText).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/)
  })

  test('uma alteração feita pelo admin aparece em /historico (procedimento manual)', async () => {
    test.info().annotations.push({
      type: 'manual',
      description:
        'Exige admin autenticado com TOTP (aal2), que não é automatizável sem simular a autenticação. ' +
        'Procedimento: docs/audit/2026-checklist.md, "Alteração de ponta a ponta pelo admin". ' +
        'Resumo: entrar em /admin/login, concluir o TOTP, editar uma proposta (ou notícia) informando o motivo, ' +
        'abrir /historico em janela anônima e conferir a entrada com motivo e autor "Equipe do Observatório".',
    })
    test.fixme(true, 'Requer sessão de admin com TOTP: executar o procedimento manual do checklist de auditoria.')
  })
})

test.describe('fluxo completo de votação (chaves de teste do Turnstile)', () => {
  test.skip(!hasSupabase, SKIP_NO_SUPABASE)
  test.skip(!hasTurnstileTestKeys, SKIP_NO_TURNSTILE)

  async function readCounts(page: Page): Promise<{ valid: number; discarded: number }> {
    await page.goto('/resultados')
    const text = await visibleText(page)
    const valid = text.match(/Total de votos válidos:\s*(\d+)/)
    const discarded = text.match(/Votos descartados:\s*(\d+)/)
    expect(valid, 'linha "Total de votos válidos" ausente').not.toBeNull()
    expect(discarded, 'linha "Votos descartados" ausente').not.toBeNull()
    return { valid: Number(valid![1]), discarded: Number(discarded![1]) }
  }

  test('responder "Sim", votar e ver os resultados e a pizza atualizados', async ({ page }) => {
    test.setTimeout(90_000)

    await page.goto('/votar')
    const sim = page.getByRole('radio', { name: 'Sim' })
    test.skip((await sim.count()) === 0, 'votação fechada, ainda não aberta ou sem candidatos (confira VOTING_OPENS_AT)')

    const before = await readCounts(page)

    await page.goto('/votar')
    await page.getByRole('radio', { name: 'Sim' }).check()
    const candidates = page.getByRole('group', { name: 'Em quem você votaria?' }).getByRole('radio')
    await expect(candidates.first()).toBeVisible()
    await candidates.first().check()

    // O Turnstile de teste aprova sozinho; o botão só habilita depois do token.
    const submit = page.getByRole('button', { name: 'Registrar voto' })
    await expect(submit).toBeEnabled({ timeout: 30_000 })
    await submit.click()
    await expect(page.getByText('Voto registrado. Obrigado por participar!')).toBeVisible()

    await page.getByRole('link', { name: 'Ver resultados' }).click()
    await expect(page).toHaveURL(/\/resultados/)

    // Mais de 5 votos por hora do mesmo hash são descartados (suspeitos): conta-se válidos + descartados.
    const after = await readCounts(page)
    expect(after.valid + after.discarded).toBe(before.valid + before.discarded + 1)

    // Pizza Sócio × Não sócio: a seção não pode estar vazia e a linha "Sócios" precisa existir.
    const pizza = page.getByTestId('section-pizza')
    await expect(pizza).toBeVisible()
    await expect(pizza).not.toContainText('a simulação ainda não possui participantes')
    await expect(pizza).toContainText('Sócios')
    // Com votos dos dois lados o gráfico aparece; com um lado zerado só a tabela e o aviso (por desenho).
    const text = await pizza.innerText()
    if (text.includes('Ainda não há votos de')) {
      await expect(page.getByTestId('pie-chart')).toHaveCount(0)
    } else {
      await expect(page.getByTestId('pie-chart')).toBeVisible()
    }
  })
})
