import { isIP } from 'node:net'

// Primeiro endereço de x-forwarded-for, sem porta nem colchetes; null se inválido.
export function clientIp(headers: Headers): string | null {
  const raw = headers.get('x-forwarded-for')
  if (!raw) return null
  let candidate = raw.split(',')[0].trim()
  const bracketed = candidate.match(/^\[([^\]]+)\](?::\d+)?$/)
  if (bracketed) candidate = bracketed[1]
  else if (/^[^:]+:\d+$/.test(candidate)) candidate = candidate.slice(0, candidate.lastIndexOf(':'))
  return isIP(candidate) ? candidate : null
}
