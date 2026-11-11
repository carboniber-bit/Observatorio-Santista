// Encerramento: 00:00 de 12/12/2026 em Brasília.
export const VOTING_CLOSES_AT = new Date('2026-12-12T00:00:00-03:00')

export const SUSPICIOUS_VOTES_PER_HASH_PER_HOUR = 5

export function isVotingOpen(
  now: Date,
  opensAt: string | undefined = process.env.VOTING_OPENS_AT,
): boolean {
  if (Number.isNaN(now.getTime())) return false
  if (now.getTime() >= VOTING_CLOSES_AT.getTime()) return false
  if (opensAt === undefined || opensAt === '') return true
  const opens = Date.parse(opensAt)
  if (Number.isNaN(opens)) return false // configuração inválida: fecha por segurança
  return now.getTime() >= opens
}

// `votesFromHashLastHour` INCLUI o voto que está sendo registrado: até 5 votos por hora
// do mesmo hash são válidos e o 6º é suspeito.
export function classifyVote(votesFromHashLastHour: number): 'valid' | 'suspicious' {
  return votesFromHashLastHour > SUSPICIOUS_VOTES_PER_HASH_PER_HOUR ? 'suspicious' : 'valid'
}
