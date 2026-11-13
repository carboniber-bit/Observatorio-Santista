// Expressões que caracterizam ou ranqueiam candidatos; proibidas em qualquer texto do site.
export const FORBIDDEN_PHRASES = ['melhor candidato', 'mais preparado', 'mais promissor'] as const

// Devolve as expressões proibidas presentes no texto (sem diferenciar maiúsculas).
export function findForbiddenPhrases(text: string): string[] {
  const haystack = text.toLocaleLowerCase('pt-BR')
  return FORBIDDEN_PHRASES.filter((phrase) => haystack.includes(phrase))
}
