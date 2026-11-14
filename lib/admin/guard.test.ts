// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { decideAccess, isPublicAdminPath, redirectFor } from './guard'

const USER = { id: 'u1', email: 'admin@exemplo.test' }

describe('decideAccess', () => {
  it('sem usuário vai para o login', () => {
    expect(decideAccess({ user: null, aal: null, isAdmin: false })).toBe('login')
  })
  it('sessão aal1 vai para o TOTP, mesmo sendo e-mail permitido', () => {
    expect(decideAccess({ user: USER, aal: 'aal1', isAdmin: false })).toBe('mfa')
    expect(decideAccess({ user: USER, aal: 'aal1', isAdmin: true })).toBe('mfa')
  })
  it('aal ausente é tratado como aal1', () => {
    expect(decideAccess({ user: USER, aal: undefined, isAdmin: true })).toBe('mfa')
    expect(decideAccess({ user: USER, aal: null, isAdmin: true })).toBe('mfa')
  })
  it('aal2 com e-mail fora da allowlist é negado', () => {
    expect(decideAccess({ user: { id: 'u2', email: 'intruso@exemplo.test' }, aal: 'aal2', isAdmin: false })).toBe('denied')
  })
  it('aal2 e allowlist liberam', () => {
    expect(decideAccess({ user: USER, aal: 'aal2', isAdmin: true })).toBe('ok')
  })
})

describe('redirectFor', () => {
  it('cada decisão vai para um destino fixo e a negação não revela o motivo', () => {
    expect(redirectFor('login')).toBe('/admin/login')
    expect(redirectFor('mfa')).toBe('/admin/mfa')
    expect(redirectFor('denied')).toBe('/admin/login?erro=acesso')
  })
})

describe('isPublicAdminPath', () => {
  it('só login e mfa são acessíveis sem acesso completo', () => {
    expect(isPublicAdminPath('/admin/login')).toBe(true)
    expect(isPublicAdminPath('/admin/mfa')).toBe(true)
    expect(isPublicAdminPath('/admin')).toBe(false)
    expect(isPublicAdminPath('/admin/propostas')).toBe(false)
    expect(isPublicAdminPath('/admin/login/../propostas')).toBe(false)
  })
})
