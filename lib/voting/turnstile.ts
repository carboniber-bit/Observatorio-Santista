const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 5000

// Falha fechada: qualquer erro, resposta não 2xx, segredo ausente ou timeout => false.
export async function verifyTurnstile(
  token: string,
  ip: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return false

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)
  if (ip !== null) form.set('remoteip', ip)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: unknown }
    return data.success === true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
