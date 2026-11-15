import { buildCsp, securityHeaders } from './security-headers'

function directive(csp: string, name: string): string {
  const d = csp.split('; ').find((x) => x === name || x.startsWith(`${name} `))
  if (!d) throw new Error(`diretiva ausente: ${name}`)
  return d
}

describe('buildCsp', () => {
  const csp = buildCsp()
  it('tem todas as diretivas', () => {
    for (const n of ['default-src', 'script-src', 'frame-src', 'connect-src', 'img-src', 'style-src', 'font-src', 'base-uri', 'form-action', 'frame-ancestors', 'object-src', 'upgrade-insecure-requests']) {
      expect(() => directive(csp, n)).not.toThrow()
    }
  })
  it('libera Turnstile em script, frame e connect', () => {
    for (const n of ['script-src', 'frame-src', 'connect-src']) expect(directive(csp, n)).toContain('https://challenges.cloudflare.com')
  })
  it('Supabase em connect-src; data: e blob: em img-src', () => {
    expect(directive(csp, 'connect-src')).toContain('https://*.supabase.co')
    expect(directive(csp, 'connect-src')).toContain('wss://*.supabase.co')
    expect(directive(csp, 'img-src')).toContain('data:')
    expect(directive(csp, 'img-src')).toContain('blob:')
  })
  it("default-src é 'self', sem curinga", () => {
    expect(directive(csp, 'default-src')).toBe("default-src 'self'")
  })
  it("frame-ancestors 'none' e object-src 'none'", () => {
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
  })
  it('unsafe-eval só em desenvolvimento', () => {
    expect(buildCsp({ isDev: false })).not.toContain('unsafe-eval')
    expect(buildCsp()).not.toContain('unsafe-eval')
    expect(directive(buildCsp({ isDev: true }), 'script-src')).toContain("'unsafe-eval'")
  })
})

describe('securityHeaders', () => {
  it('inclui os cabeçalhos exigidos', () => {
    const h = Object.fromEntries(securityHeaders().map((x) => [x.key, x.value]))
    expect(h['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload')
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), payment=()')
    expect(h['X-Frame-Options']).toBe('DENY')
    expect(h['Content-Security-Policy']).toContain("default-src 'self'")
  })
})
