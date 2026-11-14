// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

// O painel nunca toca nas tabelas de voto nem apaga dados: varredura do código-fonte.
const ROOT = path.resolve(__dirname, '..', '..')
const FORBIDDEN = /vote_events|vote_hashes|voter_tokens|\.delete\(|truncate/i

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

describe('painel não escreve em votos nem apaga dados', () => {
  const files = [...walk(path.join(ROOT, 'app', 'admin')), ...walk(path.join(ROOT, 'lib', 'admin'))].filter(
    (f) => !/\.test\.tsx?$/.test(f),
  )

  it('encontra os arquivos do painel', () => {
    expect(files.length > 10).toBe(true)
  })

  it('nenhum arquivo cita tabelas de voto, .delete( ou truncate', () => {
    const hits = files.filter((f) => FORBIDDEN.test(readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f))
    expect(hits).toEqual([])
  })

  it('não usa a service role nem HTML bruto', () => {
    const hits = files
      .filter((f) => /service_role|SUPABASE_SERVICE_ROLE_KEY|createServiceClient|dangerouslySetInnerHTML/.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f))
    expect(hits).toEqual([])
  })
})
