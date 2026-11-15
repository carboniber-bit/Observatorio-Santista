import { pathToFileURL } from 'node:url'
import { loadSeed } from '../lib/seed/load.ts'
import { insertSeed, type SeedDb } from '../lib/seed/insert.ts'

// Uso: npm run seed -- [--dry-run] [--dir content/seed]
// Importa propostas SEMPRE como 'em_revisao'. Imprime apenas contagens (nunca segredos).

export function parseArgs(argv: string[]): { dryRun: boolean; dir: string } {
  let dryRun = false
  let dir = 'content/seed'
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true
    else if (argv[i] === '--dir' && argv[i + 1]) dir = argv[++i]
    else if (argv[i].startsWith('--dir=')) dir = argv[i].slice('--dir='.length)
  }
  return { dryRun, dir }
}

async function makeDb(): Promise<SeedDb> {
  const { createServiceClient } = await import('../lib/supabase/service.ts')
  const client = createServiceClient()
  const fail = (op: string, error: { message: string } | null) => {
    if (error) throw new Error(`${op}: ${error.message}`)
  }
  const idBySlug = async (table: 'candidates' | 'themes', slug: string) => {
    const { data, error } = await client.from(table).select('id').eq('slug', slug).maybeSingle()
    fail(`consulta ${table}`, error)
    return (data?.id as string | undefined) ?? null
  }
  return {
    findCandidateId: (slug) => idBySlug('candidates', slug),
    findThemeId: (slug) => idBySlug('themes', slug),
    async proposalExists(key) {
      const { data, error } = await client
        .from('proposals')
        .select('id')
        .eq('candidate_id', key.candidate_id)
        .eq('theme_id', key.theme_id)
        .eq('description', key.description)
        .limit(1)
      fail('consulta proposals', error)
      return (data?.length ?? 0) > 0
    },
    async insertProposal(row) {
      const { data, error } = await client.from('proposals').insert(row).select('id').single()
      fail('insert proposals', error)
      return { id: data?.id as string }
    },
    async insertSource(row) {
      const { error } = await client.from('sources').insert(row)
      fail('insert sources', error)
      return null
    },
  }
}

export async function main(argv: string[]): Promise<number> {
  const { dryRun, dir } = parseArgs(argv)
  const entries = loadSeed(dir)
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log(`Entradas válidas em ${dir}: ${entries.length}`)
  if (dryRun || !hasEnv) {
    console.log(
      dryRun
        ? 'Modo dry-run: nada foi gravado.'
        : 'Variáveis do Supabase ausentes: modo dry-run, nada foi gravado.',
    )
    return 0
  }
  const { inserted, skipped } = await insertSeed(entries, { db: await makeDb() })
  console.log(`Inseridas (em_revisao): ${inserted}. Já existentes (puladas): ${skipped}.`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err instanceof Error ? err.message : 'Falha ao importar o conteúdo inicial.')
      process.exit(1)
    },
  )
}
