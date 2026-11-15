// Marca que o importador (content/seed) coloca em citações ainda não conferidas no original.
// Módulo sem dependências: usado pelo importador, pelo painel e pelos testes.
// A mesma regra existe no banco (supabase/migrations/0007_publish_guards.sql).
export const PENDING_QUOTE_MARK = '(citação a conferir no original)'

export function hasPendingQuoteMark(excerpt: string | null | undefined): boolean {
  return (excerpt ?? '').toLocaleLowerCase('pt-BR').includes(PENDING_QUOTE_MARK.toLocaleLowerCase('pt-BR'))
}

// Trecho que conta como comprobatório: não vazio e sem a marca de "a conferir".
export function isVerifiedExcerpt(excerpt: string | null | undefined): boolean {
  return (excerpt ?? '').trim().length > 0 && !hasPendingQuoteMark(excerpt)
}
