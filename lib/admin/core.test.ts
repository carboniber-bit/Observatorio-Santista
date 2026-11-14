// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { makeAdminCore, type AdminDb, type AdminResult } from './core'

const UUID = '11111111-1111-4111-8111-111111111111'
const UUID2 = '22222222-2222-4222-8222-222222222222'
const NOW = new Date('2026-11-20T12:00:00Z')

type Call = { op: string; args: unknown }

// Dublê escrito à mão: registra cada chamada e deixa configurar contagem de fontes e falhas.
function setup(opts: { sourcesWithExcerpt?: number; dbError?: unknown; adminError?: unknown; handledRows?: number; publishedAt?: string | null } = {}) {
  const calls: Call[] = []
  const state = { status: 'em_revisao' }
  const fail = () => {
    if (opts.dbError) throw opts.dbError
  }
  const db: AdminDb = {
    async insert(table, row) {
      calls.push({ op: 'insert', args: { table, row } })
      fail()
      return { id: UUID2 }
    },
    async update(fn, args) {
      calls.push({ op: 'update', args: { fn, ...args } })
      fail()
      const status = (args.patch as { status?: string }).status
      if (status) state.status = status
    },
    async countSourcesWithExcerpt(proposalId) {
      calls.push({ op: 'count', args: { proposalId } })
      return opts.sourcesWithExcerpt ?? 0
    },
    async markCorrectionHandled(id, handledAtIso) {
      calls.push({ op: 'handled', args: { id, handledAtIso } })
      fail()
      return opts.handledRows ?? 1
    },
    async currentPublishedAt(table, id) {
      calls.push({ op: 'publishedAt', args: { table, id } })
      return opts.publishedAt ?? null
    },
  }
  let authChecks = 0
  const core = makeAdminCore({
    db,
    now: () => NOW,
    requireAdmin: async () => {
      authChecks++
      if (opts.adminError) throw opts.adminError
    },
  })
  return { core, calls, state, authChecks: () => authChecks }
}

const proposalInput = {
  candidateId: UUID,
  themeId: UUID2,
  description: 'Reforma do estatuto.',
  sourceKind: 'reportagem' as const,
  referenceYear: 2026,
}
const sourceInput = { url: 'https://exemplo.com/materia', excerpt: 'trecho' }
const newsInput = { slug: 'nova-noticia', title: 'Título', body: 'Texto', category: 'eleicao' as const, badge: 'plataforma' as const }
const analysisInput = { slug: 'nova-analise', title: 'T', facts: 'f', candidateStatements: 'c', editorialInterpretation: 'i' }
const candidateInput = { id: UUID, name: 'Nome', status: 'confirmada' as const }

// Cada ação chamada SEM motivo (vazio, espaços, 2 caracteres).
function actionsWithReason(core: ReturnType<typeof setup>['core'], reason: string): Array<[string, () => Promise<AdminResult>]> {
  return [
    ['saveProposalDraft', () => core.saveProposalDraft({ ...proposalInput, reason })],
    ['saveProposalDraft(edição)', () => core.saveProposalDraft({ ...proposalInput, id: UUID, reason })],
    ['publishProposal', () => core.publishProposal(UUID, reason)],
    ['correctProposal', () => core.correctProposal(UUID, reason)],
    ['retractProposal', () => core.retractProposal(UUID, reason, UUID2)],
    ['addSource', () => core.addSource(UUID, sourceInput, reason)],
    ['updateSource', () => core.updateSource(UUID, sourceInput, reason)],
    ['saveNewsDraft', () => core.saveNewsDraft({ ...newsInput, reason })],
    ['publishNews', () => core.publishNews(UUID, reason)],
    ['retractNews', () => core.retractNews(UUID, reason)],
    ['saveAnalysisDraft', () => core.saveAnalysisDraft({ ...analysisInput, reason })],
    ['publishAnalysis', () => core.publishAnalysis(UUID, reason)],
    ['retractAnalysis', () => core.retractAnalysis(UUID, reason)],
    ['saveCandidate', () => core.saveCandidate({ ...candidateInput, reason })],
    ['markCorrectionHandled', () => core.markCorrectionHandled(UUID, reason)],
  ]
}

describe('motivo obrigatório', () => {
  for (const reason of ['', '   ', 'ab', '  a ']) {
    it(`toda ação recusa o motivo ${JSON.stringify(reason)} sem tocar no banco`, async () => {
      const { core, calls } = setup({ sourcesWithExcerpt: 1 })
      for (const [name, run] of actionsWithReason(core, reason)) {
        const result = await run()
        expect(`${name}:${JSON.stringify(result)}`).toBe(`${name}:${JSON.stringify({ ok: false, error: 'Informe o motivo da alteração.' })}`)
      }
      expect(calls).toHaveLength(0)
    })
  }

  it('motivo ausente (undefined) também é recusado', async () => {
    const { core, calls } = setup()
    const result = await core.saveProposalDraft({ ...proposalInput } as never)
    expect(result).toEqual({ ok: false, error: 'Informe o motivo da alteração.' })
    expect(calls).toHaveLength(0)
  })
})

describe('requireAdmin', () => {
  it('falha de acesso bloqueia todas as ações e o banco não é tocado', async () => {
    const denied = new Error('NEXT_REDIRECT')
    const { core, calls } = setup({ adminError: denied, sourcesWithExcerpt: 1 })
    for (const [name, run] of actionsWithReason(core, 'motivo válido')) {
      let thrown: unknown = null
      try {
        await run()
      } catch (e) {
        thrown = e
      }
      expect(`${name}:${thrown === denied}`).toBe(`${name}:true`)
    }
    expect(calls).toHaveLength(0)
  })

  it('é chamado antes da validação do motivo', async () => {
    const denied = new Error('NEXT_REDIRECT')
    const { core } = setup({ adminError: denied })
    let thrown: unknown = null
    try {
      await core.publishProposal(UUID, '')
    } catch (e) {
      thrown = e
    }
    expect(thrown === denied).toBe(true)
  })

  it('é chamado uma vez por ação', async () => {
    const { core, authChecks } = setup()
    await core.retractNews(UUID, 'motivo válido')
    expect(authChecks()).toBe(1)
  })
})

describe('publishProposal', () => {
  it('sem fonte com trecho devolve erro amigável e a proposta continua em_revisao', async () => {
    const { core, calls, state } = setup({ sourcesWithExcerpt: 0 })
    const result = await core.publishProposal(UUID, 'revisão concluída')
    expect(result).toEqual({
      ok: false,
      error: 'Proposta sem fonte com trecho comprobatório: não pode ser publicada.',
    })
    expect(state.status).toBe('em_revisao')
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(0)
  })

  it('com fonte, chama a RPC com status publicada e o motivo', async () => {
    const { core, calls } = setup({ sourcesWithExcerpt: 1 })
    const result = await core.publishProposal(UUID, '  revisão concluída  ')
    expect(result).toEqual({ ok: true, id: UUID })
    const update = calls.find((c) => c.op === 'update')
    expect(update?.args).toEqual({
      fn: 'admin_update_proposal',
      id: UUID,
      patch: { status: 'publicada' },
      reason: 'revisão concluída',
      sourceId: undefined,
    })
  })

  it('erro do banco (regra R19) mantém em_revisao e não vaza SQL', async () => {
    const { core, state } = setup({
      sourcesWithExcerpt: 1,
      dbError: { code: 'P0001', message: 'proposta nao pode ser publicada sem ao menos uma fonte com trecho (excerpt) preenchido' },
    })
    const result = await core.publishProposal(UUID, 'revisão concluída')
    expect(result).toEqual({
      ok: false,
      error: 'Proposta sem fonte com trecho comprobatório: não pode ser publicada.',
    })
    expect(state.status).toBe('em_revisao')
  })

  it('id inválido é recusado antes do banco', async () => {
    const { core, calls } = setup({ sourcesWithExcerpt: 1 })
    const result = await core.publishProposal('abc', 'motivo válido')
    expect(result.ok).toBe(false)
    expect(calls).toHaveLength(0)
  })
})

describe('retractProposal e correctProposal', () => {
  it('retractProposal repassa o sourceId e não exige fonte', async () => {
    const { core, calls } = setup({ sourcesWithExcerpt: 0 })
    const result = await core.retractProposal(UUID, 'dado incorreto', UUID2)
    expect(result).toEqual({ ok: true, id: UUID })
    expect(calls).toHaveLength(1)
    expect(calls[0].args).toEqual({
      fn: 'admin_update_proposal',
      id: UUID,
      patch: { status: 'retirada' },
      reason: 'dado incorreto',
      sourceId: UUID2,
    })
  })

  it('correctProposal usa o status corrigida e também exige fonte com trecho', async () => {
    const semFonte = setup({ sourcesWithExcerpt: 0 })
    expect((await semFonte.core.correctProposal(UUID, 'ajuste de texto')).ok).toBe(false)
    const comFonte = setup({ sourcesWithExcerpt: 2 })
    expect((await comFonte.core.correctProposal(UUID, 'ajuste de texto', UUID2)).ok).toBe(true)
    expect((comFonte.calls.find((c) => c.op === 'update')?.args as { patch: unknown }).patch).toEqual({ status: 'corrigida' })
  })
})

describe('saveProposalDraft', () => {
  it('proposta nova é inserida como em_revisao', async () => {
    const { core, calls } = setup()
    const result = await core.saveProposalDraft({ ...proposalInput, reason: 'cadastro inicial' })
    expect(result).toEqual({ ok: true, id: UUID2 })
    expect(calls[0]).toEqual({
      op: 'insert',
      args: {
        table: 'proposals',
        row: {
          candidate_id: UUID,
          theme_id: UUID2,
          description: 'Reforma do estatuto.',
          source_kind: 'reportagem',
          reference_year: 2026,
          status: 'em_revisao',
        },
      },
    })
  })

  it('com id, edita pela RPC com motivo e sem mexer no status', async () => {
    const { core, calls } = setup()
    const result = await core.saveProposalDraft({ ...proposalInput, id: UUID, referenceYear: undefined, reason: 'correção de texto' })
    expect(result).toEqual({ ok: true, id: UUID })
    const args = calls[0].args as { fn: string; patch: Record<string, unknown>; reason: string }
    expect(args.fn).toBe('admin_update_proposal')
    expect(args.reason).toBe('correção de texto')
    expect('status' in args.patch).toBe(false)
    expect(args.patch.reference_year).toBeNull()
  })

  it('descrição em branco ou acima de 2000 caracteres é recusada', async () => {
    const { core, calls } = setup()
    const blank = await core.saveProposalDraft({ ...proposalInput, description: '   ', reason: 'motivo válido' })
    const long = await core.saveProposalDraft({ ...proposalInput, description: 'a'.repeat(2001), reason: 'motivo válido' })
    expect(blank.ok).toBe(false)
    expect(long).toEqual({ ok: false, error: 'A descrição pode ter no máximo 2000 caracteres.' })
    expect(calls).toHaveLength(0)
  })

  it('descrição de exatamente 2000 caracteres passa', async () => {
    const { core } = setup()
    const result = await core.saveProposalDraft({ ...proposalInput, description: 'a'.repeat(2000), reason: 'motivo válido' })
    expect(result.ok).toBe(true)
  })

  it('campos extras (como status) são recusados', async () => {
    const { core, calls } = setup()
    const result = await core.saveProposalDraft({ ...proposalInput, status: 'publicada', reason: 'motivo válido' } as never)
    expect(result.ok).toBe(false)
    expect(calls).toHaveLength(0)
  })
})

describe('addSource', () => {
  it('insere a fonte da proposta', async () => {
    const { core, calls } = setup()
    const result = await core.addSource(UUID, { ...sourceInput, outlet: 'Jornal', publishedOn: '2026-10-01' }, 'fonte da matéria')
    expect(result).toEqual({ ok: true, id: UUID2 })
    expect(calls[0].args).toEqual({
      table: 'sources',
      row: {
        proposal_id: UUID,
        url: 'https://exemplo.com/materia',
        outlet: 'Jornal',
        published_on: '2026-10-01',
        consulted_on: null,
        kind: null,
        excerpt: 'trecho',
      },
    })
  })

  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://exemplo.com/a', 'exemplo.com', 'JAVASCRIPT:alert(1)']) {
    it(`recusa a URL ${url}`, async () => {
      const { core, calls } = setup()
      const result = await core.addSource(UUID, { url }, 'motivo válido')
      expect(result.ok).toBe(false)
      expect(calls).toHaveLength(0)
    })
  }

  it('updateSource também recusa javascript:', async () => {
    const { core, calls } = setup()
    expect((await core.updateSource(UUID, { url: 'javascript:alert(1)' }, 'motivo válido')).ok).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('updateSource usa admin_update_source com motivo', async () => {
    const { core, calls } = setup()
    await core.updateSource(UUID, sourceInput, 'correção de trecho')
    expect((calls[0].args as { fn: string }).fn).toBe('admin_update_source')
  })
})

describe('notícias, análises, candidatos e correções', () => {
  it('notícia nova entra como rascunho', async () => {
    const { core, calls } = setup()
    await core.saveNewsDraft({ ...newsInput, reason: 'primeira versão' })
    expect((calls[0].args as { row: { status: string } }).row.status).toBe('rascunho')
  })

  it('publishNews grava status publicada e published_at', async () => {
    const { core, calls } = setup()
    await core.publishNews(UUID, 'revisada')
    expect((calls[1].args as { patch: unknown }).patch).toEqual({ status: 'publicada', published_at: NOW.toISOString() })
  })

  it('republicar notícia ou análise mantém o published_at original', async () => {
    const { core, calls } = setup({ publishedAt: '2026-11-01T10:00:00Z' })
    await core.publishNews(UUID, 'republicada')
    await core.publishAnalysis(UUID, 'republicada')
    const updates = calls.filter((c) => c.op === 'update').map((c) => (c.args as { patch: unknown }).patch)
    expect(updates).toEqual([{ status: 'publicada' }, { status: 'publicada' }])
  })

  it('retractNews e retractAnalysis gravam retirada', async () => {
    const { core, calls } = setup()
    await core.retractNews(UUID, 'erro factual')
    await core.retractAnalysis(UUID, 'erro factual')
    expect((calls[0].args as { patch: unknown }).patch).toEqual({ status: 'retirada' })
    expect((calls[1].args as { fn: string; patch: unknown }).fn).toBe('admin_update_analysis')
  })

  it('notícia com link javascript: na fonte é recusada', async () => {
    const { core, calls } = setup()
    const result = await core.saveNewsDraft({ ...newsInput, sourceUrl: 'javascript:alert(1)', reason: 'motivo válido' })
    expect(result.ok).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('notícia nova sem slug é recusada', async () => {
    const { core } = setup()
    const { slug: _slug, ...semSlug } = newsInput
    expect((await core.saveNewsDraft({ ...semSlug, reason: 'motivo válido' })).ok).toBe(false)
  })

  it('saveCandidate usa admin_update_candidate e limpa campos vazios com null', async () => {
    const { core, calls } = setup()
    const result = await core.saveCandidate({ ...candidateInput, bio: '  ', reason: 'atualização' })
    expect(result).toEqual({ ok: true, id: UUID })
    const args = calls[0].args as { fn: string; patch: Record<string, unknown> }
    expect(args.fn).toBe('admin_update_candidate')
    expect(args.patch.bio).toBeNull()
    expect(args.patch.status).toBe('confirmada')
  })

  it('saveAnalysisDraft grava os três blocos separados', async () => {
    const { core, calls } = setup()
    await core.saveAnalysisDraft({ ...analysisInput, id: UUID, reason: 'ajuste' })
    const args = calls[0].args as { fn: string; patch: Record<string, unknown> }
    expect(args.fn).toBe('admin_update_analysis')
    expect(Object.keys(args.patch).sort()).toEqual(['candidate_statements', 'editorial_interpretation', 'facts', 'title'])
  })

  it('markCorrectionHandled com zero linhas atualizadas devolve erro e não afirma sucesso', async () => {
    const { core } = setup({ handledRows: 0 })
    const result = await core.markCorrectionHandled(UUID, 'respondido ao leitor')
    expect(result).toEqual({ ok: false, error: 'Pedido não encontrado ou sem permissão. Nada foi alterado.' })
  })

  it('markCorrectionHandled grava a data de tratamento', async () => {
    const { core, calls } = setup()
    const result = await core.markCorrectionHandled(UUID, 'respondido ao leitor')
    expect(result.ok).toBe(true)
    expect(calls[0]).toEqual({ op: 'handled', args: { id: UUID, handledAtIso: NOW.toISOString() } })
  })
})

describe('erros não vazam detalhes', () => {
  it('erro de SQL vira mensagem genérica', async () => {
    const leak = { code: '23503', message: 'insert on table "proposals" violates foreign key constraint "proposals_theme_id_fkey" at /var/lib/pg stack trace' }
    const { core } = setup({ dbError: leak })
    const result = await core.saveProposalDraft({ ...proposalInput, reason: 'motivo válido' })
    expect(result).toEqual({ ok: false, error: 'Não foi possível concluir a operação. Nada foi alterado.' })
    expect(JSON.stringify(result)).not.toMatch(/proposals|constraint|stack|pg/)
  })

  it('slug duplicado tem mensagem própria e amigável', async () => {
    const { core } = setup({ dbError: { code: '23505', message: 'duplicate key value violates unique constraint "news_slug_key"' } })
    const result = await core.saveNewsDraft({ ...newsInput, reason: 'motivo válido' })
    expect(result).toEqual({ ok: false, error: 'Já existe um registro com este identificador (slug).' })
  })

  it('mensagens da guarda de fontes viram frases claras em pt-BR', async () => {
    const a = setup({ dbError: { code: 'P0001', message: 'fonte de proposta publicada nao pode ficar sem trecho (excerpt)' } })
    expect(await a.core.updateSource(UUID, sourceInput, 'motivo válido')).toEqual({
      ok: false,
      error: 'Mantenha o trecho comprobatório da fonte: uma fonte de proposta publicada não pode ficar sem trecho.',
    })
    const b = setup({ dbError: { code: 'P0001', message: 'alteracao de fonte publicada exige motivo: use admin_update_source' } })
    expect(await b.core.updateSource(UUID, sourceInput, 'motivo válido')).toEqual({ ok: false, error: 'Informe o motivo da alteração.' })
  })

  it('acesso negado do banco vira Acesso negado.', async () => {
    const { core } = setup({ dbError: { code: '42501', message: 'acesso negado: apenas administradores' } })
    expect(await core.retractNews(UUID, 'motivo válido')).toEqual({ ok: false, error: 'Acesso negado.' })
  })

  it('exceção com texto arbitrário não aparece no resultado', async () => {
    const { core } = setup({ dbError: new Error('SELECT * FROM secrets; password=hunter2') })
    const result = await core.retractNews(UUID, 'motivo válido')
    expect(JSON.stringify(result)).not.toMatch(/SELECT|hunter2/)
  })
})
