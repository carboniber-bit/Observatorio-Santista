import { z } from 'zod'

// Texto opcional: vazio (ou só espaços) vale como ausente.
function optionalText<T extends z.ZodTypeAny>(inner: T) {
  return z.preprocess((value) => {
    if (typeof value === 'string' && value.trim() === '') return undefined
    return typeof value === 'string' ? value.trim() : value
  }, inner.optional())
}

const httpUrl = z
  .string()
  .max(500)
  .refine((value) => /^https?:\/\//i.test(value), 'o link deve começar com http:// ou https://')
  .refine((value) => {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }, 'link inválido')

// Corpo do POST /api/corrections. `strict` recusa campos desconhecidos.
// `website` é o campo-isca (honeypot): a rota o trata antes desta validação.
export const correctionSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    link: optionalText(httpUrl),
    email: optionalText(z.string().max(254).email()),
    website: z.string().optional(),
  })
  .strict()

export type CorrectionInput = z.infer<typeof correctionSchema>
