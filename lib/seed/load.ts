import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  SeedValidationError,
  assertNoDuplicates,
  validateSeedFile,
  type SeedEntry,
  type ValidateOptions,
} from './schema.ts'

export type { SeedEntry } from './schema.ts'

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// Lê todos os *.json de `dir`, valida (estrito) e devolve as entradas achatadas,
// em ordem determinística: candidato, tema, descrição.
export function loadSeed(dir: string, opts: ValidateOptions = {}): SeedEntry[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
  const all: SeedEntry[] = []
  for (const file of files) {
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(path.join(dir, file), 'utf8'))
    } catch {
      throw new SeedValidationError([`${file}: JSON inválido`])
    }
    all.push(...validateSeedFile(raw, file, opts).entries)
  }
  assertNoDuplicates(all)
  return all.sort(
    (a, b) =>
      cmp(a.candidateSlug, b.candidateSlug) ||
      cmp(a.themeSlug, b.themeSlug) ||
      cmp(a.description, b.description),
  )
}
