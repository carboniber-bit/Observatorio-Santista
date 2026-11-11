import { z } from 'zod'

// Corpo do POST /api/vote. `strict` recusa campos desconhecidos e não há coercão:
// isSocio precisa ser booleano de verdade.
export const voteSchema = z
  .object({
    candidateId: z.string().uuid().nullable(),
    isSocio: z.boolean(),
    turnstileToken: z.string().min(1),
  })
  .strict()

export type VoteInput = z.infer<typeof voteSchema>
