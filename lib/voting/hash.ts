import { createHmac } from 'node:crypto'

// Data (YYYY-MM-DD) no fuso America/Sao_Paulo, independente do fuso da máquina.
function saoPauloDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

// Hash do eleitor que muda todo dia (sal = HMAC(secret, data em São Paulo)).
export function dailyVoterHash(ip: string, userAgent: string, now: Date, secret: string): string {
  const dailySalt = createHmac('sha256', secret).update(saoPauloDate(now)).digest()
  return createHmac('sha256', dailySalt).update(`${ip}|${userAgent}`).digest('hex')
}
