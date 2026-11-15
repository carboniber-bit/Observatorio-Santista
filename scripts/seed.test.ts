import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSeed } from '../lib/seed/load.ts'
import { insertSeed, type SeedDb } from '../lib/seed/insert.ts'
import { validateEntries, THEME_SLUGS, CANDIDATE_SLUGS, RESEARCH_CONSULTED_ON } from '../lib/seed/schema.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

// Fixture só de teste (nunca em content/seed).
function entry(over: Record<string, unknown> = {}, sourceOver: Record<string, unknown> = {}) {
  return {
    candidateSlug: 'marcelo-teixeira',
    themeSlug: 'futebol',
    description: 'Texto de teste da descrição.',
    sourceKind: 'reportagem',
    referenceYear: null,
    sources: [
      {
        url: 'https://exemplo.invalid/teste',
        outlet: 'Veículo de teste',
        publishedOn: '2026-11-01',
        consultedOn: RESEARCH_CONSULTED_ON,
        kind: 'reportagem',
        excerpt: 'Trecho de teste.',
        ...sourceOver,
      },
    ],
    ...over,
  }
}

function withDir<T>(files: Record<string, unknown>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(path.join(tmpdir(), 'seed-'))
  try {
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(path.join(dir, name), JSON.stringify(content))
    }
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const file = (entries: unknown[], slug = 'marcelo-teixeira') => ({
  'a.json': { candidateSlug: slug, entries },
})
const words = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`).join(' ')

function fakeDb(opts: { missingCandidate?: string } = {}) {
  const proposals: Record<string, unknown>[] = []
  const sources: Record<string, unknown>[] = []
  const db: SeedDb = {
    async findCandidateId(slug) {
      return slug === opts.missingCandidate ? null : `c-${slug}`
    },
    async findThemeId(slug) {
      return `t-${slug}`
    },
    async proposalExists(k) {
      return proposals.some(
        (p) => p.candidate_id === k.candidate_id && p.theme_id === k.theme_id && p.description === k.description,
      )
    },
    async insertProposal(row) {
      proposals.push(row)
      return { id: `p${proposals.length}` }
    },
    async insertSource(row) {
      sources.push(row)
      return null
    },
  }
  return { db, proposals, sources }
}

describe('arquivos reais', () => {
  it('carrega os 4 arquivos (vazios) e cobre os 4 slugs', () => {
    const dir = path.join(ROOT, 'content/seed')
    expect(loadSeed(dir)).toEqual([])
    for (const slug of CANDIDATE_SLUGS) {
      const raw = JSON.parse(readFileSync(path.join(dir, `${slug}.json`), 'utf8'))
      expect(raw).toEqual({ candidateSlug: slug, entries: [] })
    }
  })
  it('THEME_SLUGS tem 9 e bate com supabase/seed.sql', () => {
    expect(THEME_SLUGS).toHaveLength(9)
    const sql = readFileSync(path.join(ROOT, 'supabase/seed.sql'), 'utf8')
    const block = sql.slice(sql.indexOf('public.themes'))
    const slugs = [...block.matchAll(/\('([a-z-]+)',\s*'[^']+',\s*\d+\)/g)].map((m) => m[1])
    expect([...THEME_SLUGS]).toEqual(slugs)
  })
})

describe('validação', () => {
  it('aceita entrada completa, com referenceYear 2023', () => {
    const out = withDir(file([entry({ referenceYear: 2023 })]), (d) => loadSeed(d))
    expect(out).toHaveLength(1)
    expect(out[0].referenceYear).toBe(2023)
  })
  it('rejeita entrada sem fonte', () => {
    expect(() => withDir(file([entry({ sources: [] })]), (d) => loadSeed(d))).toThrow()
  })
  it('rejeita qualquer campo de fonte em branco ou ausente', () => {
    for (const k of ['url', 'outlet', 'publishedOn', 'consultedOn', 'kind', 'excerpt']) {
      expect(() => withDir(file([entry({}, { [k]: '  ' })]), (d) => loadSeed(d))).toThrow()
      expect(() => withDir(file([entry({}, { [k]: undefined })]), (d) => loadSeed(d))).toThrow()
    }
  })
  it('rejeita url sem http(s) e data inexistente', () => {
    expect(() => validateEntries([entry({}, { url: 'ftp://x.invalid' })])).toThrow()
    expect(() => validateEntries([entry({}, { publishedOn: '2026-02-30' })])).toThrow()
  })
  it('rejeita status publicada e qualquer chave desconhecida', () => {
    expect(() => withDir(file([entry({ status: 'publicada' })]), (d) => loadSeed(d))).toThrow()
    expect(() => withDir(file([entry({ extra: 1 })]), (d) => loadSeed(d))).toThrow()
    expect(() => validateEntries([entry({}, { extra: 1 })])).toThrow()
  })
  it('rejeita consultedOn diferente de 2026-11-08 por padrão', () => {
    expect(() => validateEntries([entry({}, { consultedOn: '2026-11-09' })])).toThrow()
    expect(validateEntries([entry({}, { consultedOn: '2026-11-09' })], { requireConsultedOn: '2026-11-09' })).toHaveLength(1)
  })
  it('limite de citação literal: 15 palavras rejeita, 14 aceita', () => {
    for (const field of ['description', 'excerpt']) {
      const make = (n: number, q: [string, string]) => {
        const text = `Disse ${q[0]}${words(n)}${q[1]} no evento.`
        return field === 'description' ? entry({ description: text }) : entry({}, { excerpt: text })
      }
      for (const q of [['"', '"'], ['“', '”']] as [string, string][]) {
        expect(() => validateEntries([make(15, q)])).toThrow()
        expect(validateEntries([make(14, q)])).toHaveLength(1)
      }
    }
  })
  it('rejeita tema desconhecido e candidato diferente do arquivo', () => {
    expect(() => validateEntries([entry({ themeSlug: 'outro' })])).toThrow()
    expect(() =>
      withDir(file([entry({ candidateSlug: 'mauricio-maruca' })]), (d) => loadSeed(d)),
    ).toThrow()
    expect(() => withDir(file([entry()], 'fulano'), (d) => loadSeed(d))).toThrow()
  })
  it('rejeita frases proibidas, descrição vazia/longa e ano fora da faixa', () => {
    for (const p of ['melhor candidato', 'mais preparado', 'mais promissor']) {
      expect(() => validateEntries([entry({ description: `Ele é o ${p} do clube.` })])).toThrow()
    }
    expect(() => validateEntries([entry({ description: '   ' })])).toThrow()
    expect(() => validateEntries([entry({ description: 'a'.repeat(2001) })])).toThrow()
    expect(() => validateEntries([entry({ referenceYear: 1999 })])).toThrow()
    expect(() => validateEntries([entry({ referenceYear: 2027 })])).toThrow()
  })
  it('rejeita duplicatas (candidato, tema, descrição)', () => {
    expect(() => validateEntries([entry(), entry()])).toThrow()
    expect(() => withDir(file([entry(), entry()]), (d) => loadSeed(d))).toThrow()
  })
  it('ordem determinística por candidato e tema', () => {
    const out = withDir(
      {
        'b.json': { candidateSlug: 'mauricio-maruca', entries: [entry({ candidateSlug: 'mauricio-maruca' })] },
        'a.json': {
          candidateSlug: 'marcelo-teixeira',
          entries: [entry({ themeSlug: 'socios-torcida' }), entry({ themeSlug: 'financas' })],
        },
      },
      (d) => loadSeed(d),
    )
    expect(out.map((e) => `${e.candidateSlug}/${e.themeSlug}`)).toEqual([
      'marcelo-teixeira/financas',
      'marcelo-teixeira/socios-torcida',
      'mauricio-maruca/futebol',
    ])
  })
})

describe('insertSeed', () => {
  it('insere só como em_revisao, com fontes, e é idempotente', async () => {
    const f = fakeDb()
    const entries = validateEntries([entry(), entry({ themeSlug: 'financas' })])
    expect(await insertSeed(entries, { db: f.db })).toEqual({ inserted: 2, skipped: 0 })
    expect(f.proposals.every((p) => p.status === 'em_revisao')).toBe(true)
    expect(f.sources).toHaveLength(2)
    expect(f.sources[0].proposal_id).toBe('p1')
    expect(await insertSeed(entries, { db: f.db })).toEqual({ inserted: 0, skipped: 2 })
    expect(f.proposals).toHaveLength(2)
  })
  it('ignora tentativa de status publicada vinda nos dados', async () => {
    const f = fakeDb()
    const bad = [{ ...entry(), status: 'publicada' }]
    await expect(insertSeed(bad as never, { db: f.db })).rejects.toThrow()
    expect(f.proposals).toHaveLength(0)
  })
  it('aborta sem escrever se faltar candidato ou se a validação falhar', async () => {
    const f = fakeDb({ missingCandidate: 'mauricio-maruca' })
    const entries = validateEntries([entry(), entry({ candidateSlug: 'mauricio-maruca' })])
    await expect(insertSeed(entries, { db: f.db })).rejects.toThrow()
    expect(f.proposals).toHaveLength(0)
    expect(f.sources).toHaveLength(0)
    const g = fakeDb()
    await expect(insertSeed([entry({ sources: [] })] as never, { db: g.db })).rejects.toThrow()
    expect(g.proposals).toHaveLength(0)
  })
})
