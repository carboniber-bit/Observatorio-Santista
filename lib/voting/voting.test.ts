import { describe, it, expect } from 'vitest'
import { dailyVoterHash } from './hash'
import { newVoterToken, verifyVoterToken } from './token'
import { isVotingOpen, VOTING_CLOSES_AT, SUSPICIOUS_VOTES_PER_HASH_PER_HOUR, classifyVote } from './rules'
import { clientIp } from './ip'

const SECRET = 'segredo-de-teste'

describe('dailyVoterHash', () => {
  const ip = '203.0.113.9'
  const ua = 'Mozilla/5.0'

  it('mesmo IP e user-agent no mesmo dia dá o mesmo hash', () => {
    const a = dailyVoterHash(ip, ua, new Date('2026-11-20T13:00:00Z'), SECRET)
    const b = dailyVoterHash(ip, ua, new Date('2026-11-20T20:00:00Z'), SECRET)
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('no dia seguinte dá hash diferente', () => {
    const a = dailyVoterHash(ip, ua, new Date('2026-11-20T13:00:00Z'), SECRET)
    const b = dailyVoterHash(ip, ua, new Date('2026-11-21T13:00:00Z'), SECRET)
    expect(a).not.toBe(b)
  })

  it('o dia vira à meia-noite de São Paulo, não de UTC', () => {
    // 23:30 de 11/12 em SP (02:30Z de 12/12) vs 00:30 de 12/12 em SP (03:30Z)
    const antes = dailyVoterHash(ip, ua, new Date('2026-12-12T02:30:00Z'), SECRET)
    const depois = dailyVoterHash(ip, ua, new Date('2026-12-12T03:30:00Z'), SECRET)
    expect(antes).not.toBe(depois)
    // 21:00 SP e 23:30 SP do mesmo dia (00:00Z e 02:30Z de 12/12) são o mesmo dia
    const noite = dailyVoterHash(ip, ua, new Date('2026-12-12T00:00:00Z'), SECRET)
    expect(noite).toBe(antes)
  })

  it('muda com IP, user-agent ou segredo', () => {
    const now = new Date('2026-11-20T13:00:00Z')
    const base = dailyVoterHash(ip, ua, now, SECRET)
    expect(dailyVoterHash('198.51.100.1', ua, now, SECRET)).not.toBe(base)
    expect(dailyVoterHash(ip, 'outro', now, SECRET)).not.toBe(base)
    expect(dailyVoterHash(ip, ua, now, 'outro-segredo')).not.toBe(base)
  })
})

describe('voter token', () => {
  it('aceita um token válido e devolve o tokenHash', () => {
    const { cookieValue, tokenHash } = newVoterToken(SECRET)
    const r = verifyVoterToken(cookieValue, SECRET)
    expect(r.ok).toBe(true)
    expect(r.tokenHash).toBe(tokenHash)
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(cookieValue.includes(tokenHash)).toBe(false)
  })

  it('gera tokens diferentes a cada chamada', () => {
    expect(newVoterToken(SECRET).cookieValue).not.toBe(newVoterToken(SECRET).cookieValue)
  })

  it('rejeita valor adulterado', () => {
    const { cookieValue } = newVoterToken(SECRET)
    const [random, sig] = cookieValue.split('.')
    const flipped = (random[0] === 'A' ? 'B' : 'A') + random.slice(1)
    expect(verifyVoterToken(`${flipped}.${sig}`, SECRET).ok).toBe(false)
    const badSig = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1)
    expect(verifyVoterToken(`${random}.${badSig}`, SECRET).ok).toBe(false)
    expect(verifyVoterToken(`${random}.`, SECRET).ok).toBe(false)
  })

  it('rejeita cookie assinado com outro segredo', () => {
    const { cookieValue } = newVoterToken('outro-segredo')
    expect(verifyVoterToken(cookieValue, SECRET)).toEqual({ ok: false })
  })

  it('entrada malformada devolve ok false sem lançar', () => {
    const { cookieValue } = newVoterToken(SECRET)
    for (const bad of ['', 'semponto', 'a.b.c', `${cookieValue}.x`, '.', '.abc', 'abc.']) {
      expect(verifyVoterToken(bad, SECRET)).toEqual({ ok: false })
    }
    expect(verifyVoterToken(undefined as unknown as string, SECRET)).toEqual({ ok: false })
    expect(verifyVoterToken(null as unknown as string, SECRET)).toEqual({ ok: false })
    expect(verifyVoterToken(42 as unknown as string, SECRET)).toEqual({ ok: false })
  })
})

describe('isVotingOpen', () => {
  const opens = '2026-11-20T00:00:00-03:00'

  it('encerra à meia-noite de 12/12 (horário de Brasília)', () => {
    expect(VOTING_CLOSES_AT.getTime()).toBe(new Date('2026-12-12T00:00:00-03:00').getTime())
    expect(isVotingOpen(new Date('2026-12-11T23:59:30-03:00'), opens)).toBe(true)
    expect(isVotingOpen(new Date('2026-12-12T00:00:00-03:00'), opens)).toBe(false)
  })

  it('antes da abertura configurada está fechada', () => {
    expect(isVotingOpen(new Date('2026-11-19T23:59:59-03:00'), opens)).toBe(false)
    expect(isVotingOpen(new Date('2026-11-20T00:00:00-03:00'), opens)).toBe(true)
  })

  it('sem abertura configurada, só vale o encerramento', () => {
    expect(isVotingOpen(new Date('2026-01-01T00:00:00-03:00'), undefined)).toBe(true)
    expect(isVotingOpen(new Date('2026-01-01T00:00:00-03:00'), '')).toBe(true)
    expect(isVotingOpen(new Date('2026-12-12T00:00:00-03:00'), '')).toBe(false)
  })

  it('abertura inválida fecha por segurança', () => {
    expect(isVotingOpen(new Date('2026-11-25T12:00:00-03:00'), 'lixo')).toBe(false)
  })

  it('lê VOTING_OPENS_AT do ambiente por padrão', () => {
    const original = process.env.VOTING_OPENS_AT
    try {
      process.env.VOTING_OPENS_AT = '2026-11-20T00:00:00-03:00'
      expect(isVotingOpen(new Date('2026-11-19T12:00:00-03:00'))).toBe(false)
      expect(isVotingOpen(new Date('2026-11-21T12:00:00-03:00'))).toBe(true)
    } finally {
      if (original === undefined) delete process.env.VOTING_OPENS_AT
      else process.env.VOTING_OPENS_AT = original
    }
  })
})

describe('classifyVote', () => {
  it('limite é 5 votos na última hora (excluindo o atual)', () => {
    expect(SUSPICIOUS_VOTES_PER_HASH_PER_HOUR).toBe(5)
    expect(classifyVote(0)).toBe('valid')
    expect(classifyVote(5)).toBe('valid')
    expect(classifyVote(6)).toBe('suspicious')
  })
})

describe('clientIp', () => {
  const h = (v?: string) => new Headers(v === undefined ? {} : { 'x-forwarded-for': v })

  it('usa o primeiro endereço da lista', () => {
    expect(clientIp(h('203.0.113.9, 10.0.0.1'))).toBe('203.0.113.9')
  })
  it('aceita IPv6', () => {
    expect(clientIp(h('2001:db8::1'))).toBe('2001:db8::1')
    expect(clientIp(h('[2001:db8::1]:443, 10.0.0.1'))).toBe('2001:db8::1')
  })
  it('remove porta de IPv4', () => {
    expect(clientIp(h('203.0.113.9:4711'))).toBe('203.0.113.9')
  })
  it('sem cabeçalho, vazio ou lixo devolve null', () => {
    expect(clientIp(h())).toBeNull()
    expect(clientIp(h(''))).toBeNull()
    expect(clientIp(h('   '))).toBeNull()
    expect(clientIp(h('não-é-ip'))).toBeNull()
    expect(clientIp(h('999.1.1.1'))).toBeNull()
  })
})
