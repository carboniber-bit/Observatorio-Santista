// Construtores puros dos cabeçalhos de segurança (usados em next.config.ts).
// 'unsafe-inline' em script-src é aceito: a hidratação do Next 15 usa scripts inline e um
// esquema com nonce tornaria todas as páginas dinâmicas. Custo: mitigação de XSS mais fraca.

const TURNSTILE = 'https://challenges.cloudflare.com'

export function buildCsp(opts: { isDev?: boolean } = {}): string {
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(opts.isDev ? ["'unsafe-eval'"] : []), TURNSTILE]
  const directives: string[][] = [
    ['default-src', "'self'"],
    ['script-src', ...scriptSrc],
    ['frame-src', TURNSTILE],
    ['connect-src', "'self'", 'https://*.supabase.co', 'wss://*.supabase.co', TURNSTILE],
    ['img-src', "'self'", 'data:', 'blob:', 'https:'],
    ['style-src', "'self'", "'unsafe-inline'"],
    ['font-src', "'self'", 'data:'],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['frame-ancestors', "'none'"],
    ['object-src', "'none'"],
    ['upgrade-insecure-requests'],
  ]
  return directives.map((d) => d.join(' ')).join('; ')
}

export function securityHeaders(opts: { isDev?: boolean } = {}): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: buildCsp(opts) },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ]
}
