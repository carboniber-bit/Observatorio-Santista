import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

function sign(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

// O cookie leva `random.assinatura`; o banco guarda só sha256(random).
export function newVoterToken(secret: string): { cookieValue: string; tokenHash: string } {
  const random = randomBytes(32).toString('base64url')
  return {
    cookieValue: `${random}.${sign(secret, random)}`,
    tokenHash: createHash('sha256').update(random).digest('hex'),
  }
}

export function verifyVoterToken(
  cookieValue: string,
  secret: string,
): { ok: boolean; tokenHash?: string } {
  if (typeof cookieValue !== 'string') return { ok: false }
  const parts = cookieValue.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false }
  const [random, signature] = parts
  const expected = Buffer.from(sign(secret, random))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false }
  return { ok: true, tokenHash: createHash('sha256').update(random).digest('hex') }
}
