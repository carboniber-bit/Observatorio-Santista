# Observatório Santista 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a plataforma independente do Observatório Santista 2026: candidatos, propostas com fonte, comparador, simulação de voto com pergunta "sócio", resultados, histórico editorial público e painel admin.

**Architecture:** Next.js (App Router) renderiza páginas públicas no servidor a partir do Supabase (Postgres com RLS). Regras de integridade (votos só de inserção, histórico de alterações, regra de publicação) vivem no banco e são testadas com pgTAP; a lógica de antifraude é pura em `lib/voting`. Votos e correções entram por Route Handlers com validação zod.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Supabase (Postgres, Auth com TOTP), Recharts, zod, Vitest, Playwright, pgTAP (`supabase test db`), Cloudflare Turnstile, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-09-observatorio-santista-2026-design.md`

## Global Constraints

- Idioma de toda a interface: pt-BR. Nome da marca: `OBSERVATÓRIO SANTISTA 2026`. Sem escudo, baleia, estrelas ou qualquer elemento do clube.
- Candidatos (4), slugs: `marcelo-teixeira`, `mauricio-maruca`, `jose-renato-quaresma`, `ivan-luduvice`.
- Texto exato para tema sem proposta: `Não foi localizada proposta pública verificável.`
- Título da home: `ELEIÇÃO SANTOS 2026`. Subtítulo: `O futuro do Santos em debate. Informação, propostas e participação da torcida.` Apresentação: `Um observatório independente criado para acompanhar a eleição presidencial do Santos Futebol Clube em 2026. Conheça os candidatos, compare propostas verificadas, acompanhe a disputa e participe da nossa simulação de intenção de voto.`
- Aviso de independência (página "Sobre o Observatório"), três parágrafos exatos: `Este é um projeto independente, sem vínculo oficial com o Santos Futebol Clube, seus conselheiros, candidatos ou chapas. Seu objetivo é reunir informações públicas e verificáveis sobre a eleição presidencial de 2026 e oferecer uma simulação informal de intenção de voto entre os participantes da plataforma.` / `A votação não é oficial, não substitui o processo eleitoral do clube e não representa necessariamente a opinião de todos os torcedores ou associados.` / `As informações são apresentadas com o compromisso de imparcialidade, transparência e respeito aos envolvidos.`
- Votação encerra em 11/12/2026 às 23:59 (America/Sao_Paulo): aberta enquanto `now < 2026-12-12T00:00:00-03:00`.
- `vote_events` é somente inserção; nenhum papel (inclusive admin) tem update ou delete nela. Votos não guardam nome, CPF, e-mail, telefone nem IP.
- Hash de IP: apagado após 7 dias. E-mail opcional de correção: apagado 90 dias após o tratamento. Cookies: só essenciais.
- Proposta só vira `publicada` com fonte e trecho comprobatório; toda edição em proposta, notícia ou candidato exige `motivo` e grava em `change_log`; nada é apagado.
- Propostas importadas entram sempre como `em_revisao`.
- Os 4 candidatos usam o mesmo componente, com os mesmos campos na mesma ordem. Proibido nos textos: "melhor candidato", "mais preparado", "mais promissor".
- Paleta preto, branco e cinzas; gráficos com 4 tons neutros mais padrões de preenchimento. WCAG AA. Responsivo em computador, tablet e celular.

## Review Focus

1. Dois cliques ou duas requisições simultâneas com o mesmo cookie: só um voto é gravado (teste na Task 5).
2. Voto antes da abertura ou depois de 11/12/2026 23:59: rejeitado com status 410 e mensagem clara (Task 4 e Task 5).
3. Payload com `candidateId` inexistente, `isSocio` ausente ou IP ausente/IPv6/lista em `x-forwarded-for`: 400 sem gravar, ou IP tratado corretamente (Task 5).
4. Zero votos ou votos só de um grupo: nenhum `NaN%` nem divisão por zero, e a pizza Sócio × Não sócio mostra mensagem em vez de gráfico vazio (Task 6).
5. Conteúdo editorial com `<script>` ou HTML: aparece como texto, sem execução (Task 8).

---

### Task 1: Scaffold, tokens visuais e casca do site

**Files:**
- Create: `package.json`, `app/layout.tsx`, `app/globals.css`, `components/IndependenceBanner.tsx`, `components/SiteHeader.tsx`, `lib/brand.ts`, `.env.example`, `vitest.config.ts`
- Test: `components/IndependenceBanner.test.tsx`

**Interfaces:**
- Produces: `BRAND_NAME: string` e `INDEPENDENCE_SHORT: string` em `lib/brand.ts`; `<IndependenceBanner />` renderizado no layout de todas as páginas; tokens Tailwind `ink`, `paper`, `gray-1..4` e `chart-1..4`.

- [ ] **Step 1: Teste falhando** em `components/IndependenceBanner.test.tsx`: renderiza o banner e espera `getByRole('contentinfo')` contendo `sem vínculo oficial com o Santos Futebol Clube`.
- [ ] **Step 2:** `npx vitest run components/IndependenceBanner.test.tsx` deve FALHAR (componente inexistente).
- [ ] **Step 3:** Criar o projeto Next.js com TypeScript e Tailwind, Vitest com Testing Library, `.env.example` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VOTE_HASH_SECRET`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CRON_SECRET`, `VOTING_OPENS_AT` (ISO 8601 com fuso, data de abertura da votação). Implementar `IndependenceBanner` (faixa fixa no rodapé do layout) e `SiteHeader` com os links do mapa de páginas da spec §7. Fontes: serifada nos títulos, sem serifa na interface.
- [ ] **Step 4:** Vitest PASSA; `npm run build` conclui.
- [ ] **Step 5: Commit** `feat: scaffold Next.js com casca e aviso de independência`.

### Task 2: Esquema do banco, RLS e imutabilidade dos votos

**Files:**
- Create: `supabase/migrations/0001_core.sql`, `supabase/seed.sql` (4 candidatos e 9 temas), `lib/db/types.ts` (gerado)
- Test: `supabase/tests/001_core.test.sql`

**Interfaces:**
- Produces (tabelas): `candidates(id, slug, name, ticket_name, vice, status, bio, club_history, trajectory, photo_url, updated_at)`, `themes(id, slug, name, position)`, `proposals(id, candidate_id, theme_id, description, source_kind, reference_year, status)`, `sources(id, proposal_id, url, outlet, published_on, consulted_on, kind, excerpt)`, `news`, `analyses`, `change_log`, `correction_requests(id, body, link, email, status, handled_at, created_at)`, `vote_events(id, candidate_id null, is_socio, flag, created_at)`, `vote_hashes(vote_id, voter_hash, created_at)`, `voter_tokens(token_hash pk, created_at)`, `admin_allowlist(email)`.
- `source_kind` ∈ `documento_da_chapa | entrevista_direta | reportagem | declaracao_como_presidente`; `status` de proposta ∈ `em_revisao | publicada | corrigida | retirada`; `flag` ∈ `valid | suspicious`.

- [ ] **Step 1: Testes pgTAP falhando** (`supabase test db`): (a) papel `anon` lê só propostas `publicada` ou `corrigida`; (b) `anon` não insere em `vote_events` diretamente; (c) mesmo com o papel admin autenticado, `UPDATE` e `DELETE` em `vote_events` levantam erro; (d) `DELETE` em `proposals`, `news` e `candidates` levanta erro; (e) `candidates` tem exatamente 4 linhas após o seed.
- [ ] **Step 2:** `supabase test db` FALHA.
- [ ] **Step 3:** Escrever a migração: tabelas acima, RLS ativada em todas, `REVOKE UPDATE, DELETE ON vote_events FROM PUBLIC, anon, authenticated, service_role` mais gatilho que bloqueia qualquer update/delete, políticas de leitura pública restritas ao conteúdo publicado, escrita do admin condicionada a `auth.jwt()->>'aal' = 'aal2'` e e-mail em `admin_allowlist`. `vote_hashes` fica separada para que `vote_events` seja estritamente imutável e os hashes possam ser apagados (ver Desvios da spec).
- [ ] **Step 4:** `supabase test db` PASSA; gerar `lib/db/types.ts` com `supabase gen types typescript --local`.
- [ ] **Step 5: Commit** `feat(db): esquema, RLS e votos imutáveis`.

### Task 3: Histórico de alterações e regra de publicação

**Files:**
- Create: `supabase/migrations/0002_editorial_rules.sql`
- Test: `supabase/tests/002_editorial.test.sql`

**Interfaces:**
- Produces (RPC, executável só pelo admin aal2): `admin_update_proposal(p_id uuid, p_patch jsonb, p_reason text, p_source_id uuid default null) returns proposals`, mesmo padrão em `admin_update_news` e `admin_update_candidate`. Cada RPC define `app.change_reason`, `app.change_source_id` e `app.change_author` (e-mail do JWT) via `set_config(..., true)` antes do update.
- `change_log(id, table_name, row_id, old_value jsonb, new_value jsonb, changed_at, reason, source_id, author)`, legível publicamente.

- [ ] **Step 1: Testes pgTAP falhando:** (a) update em `proposals` sem `app.change_reason` levanta erro; (b) update com motivo grava 1 linha em `change_log` com `old_value`, `new_value`, `reason`, `author` preenchidos; (c) mudar `status` para `publicada` sem fonte com `excerpt` não vazio levanta erro; (d) retirar proposta muda `status` para `retirada` e a linha continua existindo; (e) `anon` lê `change_log`.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar gatilhos `BEFORE UPDATE` (exigem motivo; bloqueiam publicação sem fonte e trecho) e `AFTER UPDATE` (gravam `change_log`) em `proposals`, `news` e `candidates`, mais as três RPCs.
- [ ] **Step 4:** Rodar e ver PASSAR.
- [ ] **Step 5: Commit** `feat(db): change_log, regra de publicação e RPCs do admin`.

### Task 4: Domínio do voto (funções puras)

**Files:**
- Create: `lib/voting/hash.ts`, `lib/voting/token.ts`, `lib/voting/rules.ts`, `lib/voting/ip.ts`
- Test: `lib/voting/voting.test.ts`

**Interfaces:**
- Produces:
  - `dailyVoterHash(ip: string, userAgent: string, now: Date, secret: string): string` (HMAC-SHA256; sal = HMAC do `secret` com a data em America/Sao_Paulo no formato `YYYY-MM-DD`).
  - `newVoterToken(secret: string): { cookieValue: string; tokenHash: string }` e `verifyVoterToken(cookieValue: string, secret: string): { ok: boolean; tokenHash?: string }`.
  - `isVotingOpen(now: Date): boolean`.
  - `SUSPICIOUS_VOTES_PER_HASH_PER_HOUR = 5` e `classifyVote(votesFromHashLastHour: number): 'valid' | 'suspicious'` (suspeito quando `> 5`; este limite entra na Metodologia).
  - `clientIp(headers: Headers): string | null` (primeiro endereço de `x-forwarded-for`; aceita IPv6; `null` se ausente).

- [ ] **Step 1: Testes falhando:** mesmo IP e user-agent no mesmo dia dá o mesmo hash; no dia seguinte dá hash diferente; `isVotingOpen(new Date('2026-12-11T23:59:30-03:00'))` é `true` e `isVotingOpen(new Date('2026-12-12T00:00:00-03:00'))` é `false`; antes da abertura configurada (`VOTING_OPENS_AT`) é `false`; `verifyVoterToken` rejeita valor adulterado; `classifyVote(5)` é `valid` e `classifyVote(6)` é `suspicious`; `clientIp` com `"203.0.113.9, 10.0.0.1"` retorna `203.0.113.9`, com `"2001:db8::1"` retorna o mesmo, sem cabeçalho retorna `null`.
- [ ] **Step 2:** `npx vitest run lib/voting` FALHA.
- [ ] **Step 3:** Implementar com `node:crypto`; comparação do token em tempo constante (`timingSafeEqual`).
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat(voting): hash diário, token assinado e regras`.

### Task 5: RPC `cast_vote` e `POST /api/vote`

**Files:**
- Create: `supabase/migrations/0003_cast_vote.sql`, `app/api/vote/route.ts`, `lib/voting/turnstile.ts`, `lib/voting/schema.ts`
- Test: `supabase/tests/003_cast_vote.test.sql`, `app/api/vote/route.test.ts`

**Interfaces:**
- Consumes: Task 4 (`isVotingOpen`, `dailyVoterHash`, `verifyVoterToken`, `classifyVote`, `clientIp`).
- Produces: RPC `cast_vote(p_token_hash text, p_candidate_id uuid, p_is_socio boolean, p_voter_hash text, p_flag text) returns boolean` (`false` se o token já votou; insere em `voter_tokens`, `vote_events` e `vote_hashes` na mesma transação; sem ligação entre token e voto). `voteSchema` (zod): `{ candidateId: uuid | null, isSocio: boolean, turnstileToken: string }`. `verifyTurnstile(token: string, ip: string | null): Promise<boolean>`. Respostas da rota: 200 `{status:'recorded'}`, 409 `{status:'already_voted'}`, 403 captcha, 410 fora do período, 400 payload inválido.

- [ ] **Step 1: Testes falhando:** pgTAP: duas chamadas de `cast_vote` com o mesmo `token_hash` gravam 1 só voto e a segunda retorna `false`; `vote_events` não tem coluna que ligue ao token. Rota (Vitest com Supabase e Turnstile simulados): voto válido dá 200 e cookie `os26_voter` HttpOnly; segunda requisição com o mesmo cookie dá 409; **duas requisições simultâneas com o mesmo cookie** (`Promise.all`) resultam em um 200 e um 409; fora do período dá 410; captcha inválido dá 403; `candidateId` inexistente, `isSocio` ausente ou corpo vazio dão 400 sem gravar; sem IP no cabeçalho a rota ainda funciona e usa o hash de `"unknown"`.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar RPC e rota: validar, checar período, verificar captcha, ler ou emitir token, contar votos recentes do hash em `vote_hashes` na última hora, classificar e chamar `cast_vote` com a chave de serviço. Nenhum IP em log.
- [ ] **Step 4:** Rodar e ver PASSAR.
- [ ] **Step 5: Commit** `feat(voting): rota de voto com antifraude proporcional`.

### Task 6: Resultados, gráficos e página `/resultados`

**Files:**
- Create: `supabase/migrations/0004_results.sql`, `lib/results.ts`, `components/charts/BarsChart.tsx`, `PieChart.tsx`, `DailyChart.tsx`, `components/ResultsPanel.tsx`, `app/resultados/page.tsx`
- Test: `supabase/tests/004_results.test.sql`, `lib/results.test.ts`, `components/ResultsPanel.test.tsx`

**Interfaces:**
- Produces: funções SQL `get_results(p_filter text)`, `get_socio_split()`, `get_daily_series(p_filter text)`, `get_discarded_count()` (só `flag='valid'` entra nos totais). `type ResultsFilter = 'all' | 'socio' | 'nao_socio'`; `type ResultsSummary = { total: number; byCandidate: { candidateId: string | null; votes: number; pct: number }[]; discarded: number; lastUpdated: string | null }`; `getResults(filter: ResultsFilter): Promise<ResultsSummary>`; `getSocioSplit(): Promise<{ socio: number; naoSocio: number }>`; `getDailySeries(filter): Promise<{ day: string; votes: number }[]>`.

- [ ] **Step 1: Testes falhando:** pgTAP: votos `suspicious` não entram em `get_results`, mas entram em `get_discarded_count`; filtro `socio` conta só `is_socio = true`. Vitest: `getResults('all')` com zero votos retorna `total: 0` e `pct: 0` em todas as linhas (sem `NaN`); `ResultsPanel` com zero votos mostra `a simulação ainda não possui participantes` e nenhum `%`; com votos só de sócios, a pizza Sócio × Não sócio mostra a mensagem `Ainda não há votos de não sócios` em vez de gráfico vazio; abaixo de 30 votos totais aparece o aviso de amostra pequena; o rótulo da pizza contém `autodeclarado`; a ordem na página é: resultados gerais, filtro, pizza.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar SQL, wrappers e componentes Recharts (barras, pizza, série diária, 4 tons neutros mais padrões SVG de preenchimento, tooltip e tabela acessível equivalente a cada gráfico). A página mostra data e hora da última atualização e o contador de votos descartados.
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat(results): resultados, filtro de sócios e gráficos`.

### Task 7: Página `/votar`

**Files:**
- Create: `app/votar/page.tsx`, `components/VoteForm.tsx`
- Test: `components/VoteForm.test.tsx`

**Interfaces:**
- Consumes: `POST /api/vote` (Task 5), candidatos de `candidates`.

- [ ] **Step 1: Testes falhando:** a lista de candidatos não aparece antes de responder `Você é sócio do Santos?`; o botão de enviar fica desabilitado até escolher candidato (ou `Branco/Indeciso`) e responder a pergunta; o aviso de privacidade e o texto "votação espontânea, não é pesquisa científica" estão visíveis antes do envio; resposta 409 mostra que o voto já foi registrado e leva aos resultados; 410 mostra a mensagem de votação encerrada com link para resultados congelados; os 4 candidatos aparecem na mesma ordem e com o mesmo estilo.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar `VoteForm` (componente cliente, widget do Turnstile, navegação por teclado, rótulos acessíveis).
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat(vote): formulário com pergunta de sócio`.

### Task 8: Camada de leitura editorial e comparador

**Files:**
- Create: `lib/editorial/queries.ts`, `lib/editorial/comparison.ts`, `lib/editorial/text.tsx`
- Test: `lib/editorial/comparison.test.ts`, `lib/editorial/text.test.tsx`

**Interfaces:**
- Produces: `MISSING_PROPOSAL_TEXT = 'Não foi localizada proposta pública verificável.'`; `getCandidates(): Promise<Candidate[]>`; `getCandidateBySlug(slug: string)`; `getPublishedProposals(candidateId: string): Promise<(Proposal & { sources: Source[] })[]>`; `type ComparisonCell = { kind: 'proposal'; proposals: (Proposal & { sources: Source[] })[] } | { kind: 'missing'; text: string }`; `buildComparison(candidateSlugs: string[]): Promise<{ themes: Theme[]; columns: { candidate: Candidate; cells: ComparisonCell[] }[] }>`; `<EditorialText value={string} />` (renderiza só texto, sem HTML).

- [ ] **Step 1: Testes falhando:** tema sem proposta publicada vira `{kind:'missing', text: MISSING_PROPOSAL_TEXT}`; proposta `em_revisao` nunca aparece; `buildComparison` com 2 slugs devolve 2 colunas e 9 células cada, na ordem dos temas; `<EditorialText value="<script>alert(1)</script>" />` renderiza o texto literal e `container.querySelector('script')` é `null`.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar com o cliente Supabase anônimo (RLS garante o filtro por status).
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat(editorial): leitura publicada e comparador`.

### Task 9: Páginas de candidato e `/comparador`

**Files:**
- Create: `components/CandidateProfile.tsx`, `components/SourcePopover.tsx`, `app/candidatos/[slug]/page.tsx`, `app/comparador/page.tsx`, `components/ComparatorTable.tsx`
- Test: `components/CandidateProfile.test.tsx`, `components/ComparatorTable.test.tsx`

**Interfaces:**
- Consumes: Task 8. Ordem fixa dos campos do perfil: nome, situação da candidatura, biografia, histórico no Santos, trajetória administrativa, propostas por tema, entrevistas e declarações, fontes e referências, data da última atualização.

- [ ] **Step 1: Testes falhando:** os perfis dos 4 candidatos renderizam a **mesma lista de rótulos de campo na mesma ordem** (teste que compara os rótulos); campo vazio mostra `MISSING_PROPOSAL_TEXT` ou a frase equivalente para informação não localizada; cada proposta tem botão `Fonte e verificação` que revela URL, veículo, data da publicação, data da consulta, tipo e trecho; proposta com `reference_year < 2026` mostra o selo com o ano; sem foto, aparecem as iniciais; o comparador deixa escolher quais candidatos comparar (mínimo 2) e usa células `missing` sem preencher suposições.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar com um único `CandidateProfile` e selo de tipo de fonte (documento da chapa, entrevista direta, reportagem, declaração como presidente em exercício).
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat(pages): perfis de candidato e comparador`.

### Task 10: Notícias, análises e histórico de atualizações

**Files:**
- Create: `app/noticias/page.tsx`, `app/analises/page.tsx`, `app/analises/[slug]/page.tsx`, `app/historico/page.tsx`, `lib/editorial/changelog.ts`
- Test: `lib/editorial/changelog.test.ts`, `app/analises/analysis.test.tsx`

**Interfaces:**
- Produces: `getChangeLog(limit?: number): Promise<{ changedAt: string; tableName: string; reason: string; sourceUrl: string | null; author: string; oldValue: unknown; newValue: unknown }[]>`.

- [ ] **Step 1: Testes falhando:** o histórico vem em ordem decrescente de data e mostra motivo e fonte; uma retirada aparece como entrada, não some; uma análise renderiza três blocos rotulados `Fatos`, `Declarações dos candidatos` e `Interpretação editorial`; a página de notícias filtra pelas 6 categorias da spec §5; nenhum texto de página contém as expressões proibidas (teste varre o HTML renderizado).
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar as páginas e o selo "dado da plataforma / informação de terceiros / análise editorial".
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat(pages): notícias, análises e histórico público`.

### Task 11: Pedido de correção e rotina de limpeza

**Files:**
- Create: `app/corrigir/page.tsx`, `app/api/corrections/route.ts`, `app/api/cron/purge/route.ts`, `supabase/migrations/0005_purge.sql`, `vercel.json`
- Test: `app/api/corrections/route.test.ts`, `supabase/tests/005_purge.test.sql`

**Interfaces:**
- Produces: função SQL `purge_expired() returns void` (apaga `vote_hashes` com mais de 7 dias e `email` de `correction_requests` com `handled_at` há mais de 90 dias, mantendo o restante da linha). Rota cron exige `Authorization: Bearer ${CRON_SECRET}`.

- [ ] **Step 1: Testes falhando:** campo-isca preenchido retorna 200 sem gravar; 6ª requisição do mesmo hash em 1 hora retorna 429; corpo vazio ou maior que 2.000 caracteres retorna 400; pgTAP: `purge_expired` apaga hashes com 8 dias e mantém os de 6 dias; apaga o e-mail de uma correção tratada há 91 dias e mantém o texto; a rota cron sem o segredo retorna 401.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar; `vercel.json` agenda o cron diário.
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat: pedidos de correção e limpeza por retenção`.

### Task 12: Painel `/admin`

**Files:**
- Create: `middleware.ts`, `app/admin/**` (login, inscrição TOTP, propostas, fontes, notícias, análises, candidatos, correções, indicadores), `lib/admin/actions.ts`
- Test: `lib/admin/actions.test.ts`, `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: RPCs da Task 3. Produces (server actions): `saveProposalDraft(input: ProposalInput): Promise<{ id: string }>`, `publishProposal(id: string, reason: string): Promise<void>`, `retractProposal(id: string, reason: string, sourceId?: string): Promise<void>`; equivalentes para notícias e candidatos. Indicadores só leem as funções de resultados.

- [ ] **Step 1: Testes falhando:** `publishProposal` sem fonte e trecho retorna erro e a proposta continua `em_revisao`; qualquer action sem `reason` retorna erro; sessão sem `aal2` é redirecionada para a inscrição do TOTP; e-mail fora de `admin_allowlist` não acessa; e2e: o painel não contém formulário, botão nem rota que edite ou apague votos (a busca por `vote_events` nas rotas de escrita do código retorna zero).
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar login e TOTP do Supabase Auth, middleware de proteção, telas e actions, com log das ações do admin.
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat(admin): painel protegido com 2FA`.

### Task 13: Páginas institucionais e início

**Files:**
- Create: `app/page.tsx`, `app/sobre/page.tsx`, `app/metodologia/page.tsx`, `app/privacidade/page.tsx`, `app/cookies/page.tsx`
- Test: `app/institutional.test.tsx`

**Interfaces:**
- Consumes: `getResults`, `getSocioSplit` (Task 6), `getCandidates` (Task 8).

- [ ] **Step 1: Testes falhando:** a home contém o título, o subtítulo e o texto de apresentação exatos das Global Constraints; com zero votos a home mostra `a simulação ainda não possui participantes` e nenhum percentual; `/sobre` contém os três parágrafos exatos do aviso; `/metodologia` tem as 4 partes (`Critérios editoriais`, `Metodologia da simulação`, `Limitações da pesquisa`, `Privacidade e proteção de dados`) e cita o limite de 5 votos por hora por hash, o período até 11/12/2026 23:59, a autodeclaração de sócio e os prazos de retenção (7 e 90 dias); `/privacidade` indica o controlador (o autor do projeto), o canal para direitos do titular da LGPD, os dados coletados, a retenção e o uso do Turnstile; `/cookies` lista só os cookies essenciais `os26_voter` e a preferência de filtro.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Implementar. A home reúne: destaque da simulação, total de votos, % por candidato, últimas notícias e propostas publicadas, acesso rápido aos 4 candidatos e o aviso de independência.
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat(pages): início, sobre, metodologia, privacidade e cookies`.

### Task 14: Marca, SEO, segurança e acessibilidade

**Files:**
- Create: `public/brand/logo-horizontal.svg`, `logo-compact.svg`, `public/favicon.svg`, `app/sitemap.ts`, `app/robots.ts`, `lib/seo.ts`, `next.config.ts` (cabeçalhos)
- Test: `e2e/a11y.spec.ts`, `e2e/headers.spec.ts`

- [ ] **Step 1: Testes falhando:** e2e com Playwright e axe: zero violações sérias ou críticas em `/`, `/votar`, `/resultados`, `/comparador`, `/candidatos/ivan-luduvice`; navegação completa por teclado até enviar um voto; respostas incluem `Content-Security-Policy` e `Strict-Transport-Security`; `/sitemap.xml` lista as páginas públicas e não lista `/admin`; viewports 375, 768 e 1280 sem rolagem horizontal.
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Criar o logotipo tipográfico (só texto, linhas de campo como detalhe, versão compacta "OS26"), metadados e dados estruturados por página, cabeçalhos de segurança.
- [ ] **Step 4:** PASSA.
- [ ] **Step 5: Commit** `feat: marca, SEO, cabeçalhos de segurança e acessibilidade`.

### Task 15: Conteúdo inicial a partir da pesquisa

**Files:**
- Create: `content/seed/*.json` (um por candidato), `scripts/seed.ts`, `content/seed/README.md`
- Test: `scripts/seed.test.ts`

**Interfaces:**
- Produces: `loadSeed(dir: string): SeedEntry[]` com `SeedEntry = { candidateSlug; themeSlug; description; sourceKind; referenceYear; sources: { url; outlet; publishedOn; consultedOn; kind; excerpt }[] }`; `scripts/seed.ts` insere tudo com `status = 'em_revisao'`.

- [ ] **Step 1: Testes falhando:** entrada sem fonte completa (todos os campos) é rejeitada; entrada com `status: 'publicada'` é rejeitada; `consultedOn` é `2026-11-08` nas entradas desta pesquisa; nenhuma `description` ou `excerpt` ultrapassa 14 palavras entre aspas literais; os 4 arquivos cobrem os mesmos 9 temas (temas sem proposta ficam sem entrada, nunca com texto de preenchimento).
- [ ] **Step 2:** Rodar e ver FALHAR.
- [ ] **Step 3:** Transcrever as propostas dos relatórios de pesquisa de 08/11/2026 (Teixeira, Maruca, Quaresma, Luduvice), parafraseadas, com URL, veículo, data e tipo da fonte; marcar material de 2023 com `referenceYear: 2023`. Os pontos pendentes da spec §10 viram nota no campo `excerpt` ("citação a conferir no original").
- [ ] **Step 4:** PASSA; rodar o seed em ambiente de teste.
- [ ] **Step 5: Commit** `feat(content): propostas iniciais em revisão`.

### Task 16: Auditoria final e implantação

**Files:**
- Create: `docs/audit/2026-checklist.md`, `e2e/neutrality.spec.ts`, `docs/deploy.md`

- [ ] **Step 1: Testes falhando:** e2e de neutralidade: os 4 perfis têm o mesmo número de seções; nenhuma página pública contém as expressões proibidas; todo item publicado tem `Fonte e verificação`; `/historico` mostra uma alteração feita de ponta a ponta pelo admin; fluxo completo: responder "sou sócio", votar, ver resultados atualizados e a pizza.
- [ ] **Step 2:** Rodar e ver FALHAR onde houver lacuna.
- [ ] **Step 3:** Corrigir as lacunas; escrever `docs/deploy.md` (projeto na Vercel com ambientes de teste e produção, variáveis de `.env.example`, domínio próprio e DNS, migrações do Supabase, TOTP do admin, `VOTING_OPENS_AT`) e `docs/audit/2026-checklist.md` (imparcialidade, fontes, segurança, responsividade).
- [ ] **Step 4:** Toda a suíte (`npm test`, `supabase test db`, `npx playwright test`) PASSA.
- [ ] **Step 5: Commit** `chore: auditoria e guia de implantação`.

---

## Desvios da spec resolvidos neste plano

1. **`voter_hash` fora de `vote_events`.** Fica em `vote_hashes`, para a tabela de votos ser estritamente imutável enquanto os hashes são apagados após 7 dias.
2. **`voter_tokens`.** Tabela de tokens aleatórios (hash do cookie), sem ligação com o voto, mantida até o fim do período, para impedir voto duplo de forma atômica e depois da limpeza dos hashes.
3. **Limite de 5 votos por hora por hash** para marcar como suspeito (a spec deixa em aberto), documentado na Metodologia.
