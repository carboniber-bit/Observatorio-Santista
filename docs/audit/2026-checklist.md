# Checklist de auditoria final: Observatório Santista 2026

Marque cada item só depois de executar a verificação indicada e ver o resultado esperado. Faça a auditoria no site de produção (ou em um preview idêntico) e anote data, versão (hash do commit na Vercel) e quem verificou.

- Data: ____/____/2026   Commit implantado: ____________   Auditor: ____________

## Como usar os trechos SQL

Supabase > SQL Editor. Os trechos que simulam um visitante usam `begin; set local role anon; ...; rollback;`: nada fica gravado. Rode cada bloco inteiro de uma vez.

## 0. Rotinas automatizadas (a executar por você, na sua máquina)

Estas rotinas NÃO foram executadas por quem escreveu este checklist (sem npm, Docker nem Supabase no ambiente de autoria).

- [ ] `npm test` termina sem falhas (esperado: todas as suítes verdes; na última validação eram 278 testes).
- [ ] `npm run build` termina sem erro.
- [ ] `supabase start` e depois `supabase test db` passam (6 arquivos em `supabase/tests/`, 001 a 006).
- [ ] `npx playwright install chromium` e `npm run e2e` passam (acessibilidade, cabeçalhos, sitemap/robots, painel).
- [ ] `npx playwright test e2e/neutrality.spec.ts` com Supabase de teste e chaves de teste do Turnstile (ver README, "Auditoria de neutralidade"): nenhum teste falha. Itens pulados precisam de justificativa anotada aqui: ____________
- [ ] `npm run seed -- --dry-run` informa o número esperado de entradas válidas (sem gravar nada).

## 1. Imparcialidade

- [ ] Os 4 perfis têm o mesmo número de seções (9) e os mesmos rótulos na mesma ordem. Verificação: no console do navegador, em cada `/candidatos/<slug>`, rode `[...document.querySelectorAll('[data-testid="profile-label"]')].map(e => e.textContent).join(' | ')` e compare as 4 linhas. Automatizado em `e2e/neutrality.spec.ts`.
- [ ] Os 4 perfis listam os mesmos 9 temas, na mesma ordem (`document.querySelectorAll('h3')`).
- [ ] Nenhuma página pública contém "melhor candidato", "mais preparado" ou "mais promissor" (nem flexões). Verificação: `e2e/neutrality.spec.ts`, ou em cada página `/` , `/candidatos/*`, `/comparador`, `/noticias`, `/analises` (e cada análise), `/historico`, `/sobre`, `/metodologia`, `/privacidade`, `/cookies`, `/votar`, `/resultados`, `/corrigir`: Ctrl+F pelos três radicais.
- [ ] Candidato sem proposta publicada em um tema mostra "Não foi localizada proposta pública verificável." (e não um campo em branco), nos 4 perfis.
- [ ] `/votar` lista os candidatos em ordem alfabética, Branco/Indeciso por último, e `/comparador` abre com os 4 selecionados.
- [ ] `/resultados` não tem ranking nem destaque: barras em ordem fixa, aviso de "Amostra pequena" quando há poucos votos, texto de que não é pesquisa científica.
- [ ] Auditoria final de seções: depois do último conteúdo publicado, repita os três primeiros itens desta seção com o conteúdo definitivo e registre abaixo o número de propostas publicadas por candidato (diferenças são permitidas, desde que a ausência apareça como "não localizada"):

  | Candidato | Propostas publicadas | Temas sem proposta |
  |---|---|---|
  | Marcelo Teixeira | | |
  | Maurício Maruca | | |
  | José Renato Quaresma | | |
  | Ivan Luduvice | | |

  SQL de apoio:
  ```sql
  select c.name, count(p.id) filter (where p.status in ('publicada','corrigida')) as publicadas
  from public.candidates c left join public.proposals p on p.candidate_id = c.id
  group by c.name order by c.name;
  ```

## 2. Fontes e conteúdo

- [ ] Toda proposta publicada tem o botão "Fonte e verificação" nos perfis e no comparador (automatizado em `neutrality.spec.ts`; manualmente: abra o botão e veja URL, veículo, data e trecho).
- [ ] Nenhuma proposta publicada ou corrigida sem fonte com trecho. Esperado: 0 linhas.
  ```sql
  select p.id, p.description
  from public.proposals p
  where p.status in ('publicada','corrigida')
    and not exists (select 1 from public.sources s
                    where s.proposal_id = p.id and length(trim(coalesce(s.excerpt,''))) > 0);
  ```
- [ ] Nenhum trecho ainda marcado "(citação a conferir no original)" em conteúdo publicado. Esperado: 0 linhas.
  ```sql
  select s.proposal_id, s.url from public.sources s
  join public.proposals p on p.id = s.proposal_id
  where p.status in ('publicada','corrigida') and s.excerpt ilike '%citação a conferir no original%';
  ```
- [ ] Citações literais têm no máximo 14 palavras e o restante é paráfrase (leitura por amostragem: 100% das propostas publicadas, abrindo cada fonte).
- [ ] Cada URL de fonte publicada abre (sem 404) e confirma o trecho. Anote as quebradas: ____________
- [ ] Nada de conteúdo de exemplo: busque por "EXEMPLO" e "exemplo.invalid". Esperado: 0 linhas.
  ```sql
  select id from public.proposals where description ilike '%EXEMPLO%'
  union all select proposal_id from public.sources where url ilike '%exemplo.invalid%' or outlet ilike '%EXEMPLO%';
  ```
- [ ] A situação das candidaturas (`a_confirmar`, `confirmada`, `desistiu`) corresponde ao que é público hoje, com fonte citada em `/noticias` ou no perfil.
  ```sql
  select name, status from public.candidates order by name;
  ```
- [ ] A Metodologia (`/metodologia`) bate com o comportamento real: 5 votos/hora por hash (6º é suspeito e fica fora dos totais), hash apagado em 7 dias, e-mail de correção apagado 90 dias após o tratamento, fechamento em 11/12/2026 às 23:59 (Brasília). Conferido no código em 15/11/2026: `lib/voting/rules.ts`, `supabase/migrations/0004_results.sql`, `0005_purge.sql`.
- [ ] `/historico` lista as alterações recentes com motivo, sem e-mail de autor (mostra "Equipe do Observatório").

### Alteração de ponta a ponta pelo admin (procedimento manual)

Não é automatizado porque exige senha e TOTP reais de admin (aal2).

1. Em janela anônima, abra `/historico` e anote quantas entradas existem e a mais recente.
2. Em outra janela, entre em `/admin/login` com o e-mail do admin e a senha; informe o código TOTP em `/admin/mfa`.
3. Em `/admin/propostas`, escolha uma proposta publicada, clique em "Editar" e altere um detalhe inócuo (por exemplo, um espaço ou uma vírgula), preenchendo um motivo claro (ex.: "teste de auditoria 2026"). Se preferir não alterar conteúdo real, use uma proposta em revisão do ambiente de teste.
4. Na janela anônima, recarregue `/historico`: deve aparecer uma nova entrada com o motivo informado e autor "Equipe do Observatório" (nunca o e-mail). Propostas ainda em revisão só aparecem depois de publicadas, por desenho.
5. Confirme no SQL Editor:
   ```sql
   select changed_at, table_name, reason, author from public.change_log order by changed_at desc limit 5;
   ```
   (como proprietário do projeto você vê `author`; o visitante não, ver a seção 3).
6. Desfaça a alteração pelo mesmo caminho, com o motivo "reversão do teste de auditoria". O histórico é apenas de inserção: as duas entradas permanecem, o que é o comportamento correto.

- [ ] Procedimento executado com sucesso em ____/____/2026.

## 3. Votação e integridade

- [ ] `vote_events` não tem UPDATE, DELETE nem TRUNCATE para nenhum papel da aplicação. Esperado: todas as colunas `false`.
  ```sql
  select r as papel,
         has_table_privilege(r, 'public.vote_events', 'UPDATE')   as pode_update,
         has_table_privilege(r, 'public.vote_events', 'DELETE')   as pode_delete,
         has_table_privilege(r, 'public.vote_events', 'TRUNCATE') as pode_truncate
  from unnest(array['anon','authenticated','service_role']) as r;
  ```
  (Só o dono do banco, `postgres`, mantém privilégios de manutenção; a aplicação nunca usa esse papel.)
- [ ] Anon e usuários logados não leem nem gravam em `vote_events`, `vote_hashes`, `voter_tokens` e `admin_allowlist`. Esperado: erro "permission denied" em cada `select`.
  ```sql
  begin; set local role anon;
  select * from public.vote_events limit 1;     -- permission denied
  rollback;
  begin; set local role anon;
  select * from public.vote_hashes limit 1;     -- permission denied
  rollback;
  begin; set local role anon;
  select * from public.voter_tokens limit 1;    -- permission denied
  rollback;
  begin; set local role anon;
  select * from public.admin_allowlist limit 1; -- permission denied
  rollback;
  ```
- [ ] Não existe `vote_hashes` com mais de 7 dias (rode depois das 06:00 UTC, horário do cron). Esperado: `0`.
  ```sql
  select count(*) from public.vote_hashes where created_at < now() - interval '7 days';
  select count(*) from public.correction_requests
   where submitter_hash is not null and created_at < now() - interval '7 days';
  ```
- [ ] Nenhuma coluna de `vote_events` identifica o eleitor (apenas id, candidate_id, is_socio, flag, created_at).
  ```sql
  select column_name from information_schema.columns
  where table_schema='public' and table_name='vote_events' order by ordinal_position;
  ```
- [ ] O cron de limpeza está ativo: Vercel > projeto > Settings > Cron Jobs mostra `/api/cron/purge` e a última execução com status 200. Sem credencial a rota recusa: `curl -i https://SEU-DOMINIO/api/cron/purge` devolve 401.
- [ ] Voto de ponta a ponta no site de teste: `/votar`, responder "Sim" para sócio, escolher candidato, concluir o Turnstile, "Registrar voto" mostra "Voto registrado. Obrigado por participar!"; `/resultados` soma +1 (ou +1 em "descartados" se passou de 5 votos/hora) e a pizza Sócio × Não sócio mostra "Sócios".
- [ ] Segundo voto no mesmo navegador é recusado ("Seu voto já foi registrado neste navegador.").
- [ ] Fora do período, o formulário é substituído por aviso: antes de `VOTING_OPENS_AT` ("A votação ainda não foi aberta.") e depois de 12/12/2026 00:00 em Brasília ("A votação foi encerrada em 11/12/2026 às 23:59 (horário de Brasília). Os resultados estão congelados."). Teste com `VOTING_OPENS_AT` no futuro em um preview.
- [ ] `VOTING_OPENS_AT` de produção tem o fuso explícito `-03:00`: Vercel > Settings > Environment Variables.
- [ ] Os votos aparecem apenas agregados: `/resultados` mostra totais por candidato, por dia e pizza; nenhuma página lista votos individuais.

## 4. Privacidade e LGPD

- [ ] Nenhum cookie além de `os26_voter` (HttpOnly, SameSite=Lax, Secure em produção). Verificação: DevTools > Application > Cookies em `/`, `/votar`, `/resultados`, depois de votar.
- [ ] `/privacidade` e `/cookies` descrevem exatamente o que o site faz (hash diário de 7 dias, `voter_tokens` mantido até o fim do período, e-mail de correção apagado em 90 dias).
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` está definido e `/privacidade` mostra um link `mailto:` funcional (caixa monitorada: ____________).
- [ ] Nenhum script de terceiros além do Turnstile da Cloudflare: DevTools > Network em `/votar` e `/resultados`.
- [ ] Logs da Vercel não contêm IPs, cookies nem tokens de voto (Vercel > Logs, filtrar por `/api/vote`). Os logs de plataforma da Vercel guardam IP de requisição por conta própria; registre isso como limitação conhecida se a política de privacidade não o mencionar: ____________
- [ ] Pedidos de correção: o e-mail é opcional; `submitter_hash` some após 7 dias (SQL da seção 3).

## 5. Segurança

- [ ] Rascunhos e propostas em revisão ou retiradas são invisíveis para anônimos. Esperado: `0` nas três consultas.
  ```sql
  begin; set local role anon;
  select count(*) from public.proposals where status not in ('publicada','corrigida');
  select count(*) from public.news      where status <> 'publicada';
  select count(*) from public.analyses  where status <> 'publicada';
  rollback;
  ```
- [ ] Fontes só são visíveis quando a proposta é pública. Esperado: `0`.
  ```sql
  begin; set local role anon;
  select count(*) from public.sources s
   where not exists (select 1 from public.proposals p where p.id = s.proposal_id);
  rollback;
  ```
  Complemento, como proprietário: o total de `sources` pode ser maior que o visto como anon, quando há propostas em revisão.
- [ ] `admin_allowlist` contém somente o(s) e-mail(s) esperado(s), em minúsculas.
  ```sql
  select email, email = lower(email) as minusculas from public.admin_allowlist;
  ```
- [ ] A coluna `author` de `change_log` não é legível por anônimos. Esperado: a 1ª consulta devolve linhas, a 2ª dá "permission denied for table change_log" (ou coluna).
  ```sql
  begin; set local role anon;
  select id, changed_at, reason from public.change_log limit 1;
  rollback;
  begin; set local role anon;
  select author from public.change_log limit 1;
  rollback;
  ```
- [ ] `change_log` e `vote_events` não aceitam UPDATE/DELETE por papéis da aplicação:
  ```sql
  select r, has_table_privilege(r,'public.change_log','UPDATE') as upd,
            has_table_privilege(r,'public.change_log','DELETE') as del
  from unnest(array['anon','authenticated','service_role']) r;  -- tudo false
  ```
- [ ] Cadastro público de usuários desativado e "Confirm email" ligado: Supabase > Authentication > Sign In / Providers (ou Settings) mostra "Allow new users to sign up" DESLIGADO e "Confirm email" LIGADO. Teste: `curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email":"teste-auditoria@example.com","password":"Senha-Longa-123"}'` deve recusar o cadastro (erro "Signups not allowed").
- [ ] Lista de usuários do Supabase (Authentication > Users) contém só o(s) admin(s); nenhum e-mail desconhecido.
  ```sql
  select email, email_confirmed_at is not null as confirmado, created_at from auth.users order by created_at;
  ```
- [ ] O admin tem fator TOTP verificado:
  ```sql
  select u.email, f.factor_type, f.status from auth.mfa_factors f join auth.users u on u.id = f.user_id;
  ```
  Esperado: `totp` / `verified` para cada admin.
- [ ] Sem sessão, `/admin` e subpáginas redirecionam para `/admin/login`: `curl -sI https://SEU-DOMINIO/admin` mostra `307`/`302` com `location` para `/admin/login`, `cache-control: no-store` e `x-robots-tag: noindex, nofollow`.
- [ ] `/admin` e `/api/` bloqueados em `https://SEU-DOMINIO/robots.txt`; `/sitemap.xml` não contém `/admin` (`curl -s https://SEU-DOMINIO/sitemap.xml | grep -c admin` imprime `0`). Coberto por `e2e/headers.spec.ts`.
- [ ] Cabeçalhos de segurança na home: `curl -sI https://SEU-DOMINIO/` mostra `content-security-policy`, `strict-transport-security`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy`, `permissions-policy`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `VOTE_HASH_SECRET` e `CRON_SECRET` não aparecem no código-fonte da página (Ctrl+U) nem em `git log -p` (`git log -p | grep -c service_role` deve mostrar apenas menções a nomes, nunca valores). Somente variáveis `NEXT_PUBLIC_*` podem ir ao navegador.
- [ ] `git ls-files | grep -E "^\.env"` lista apenas `.env.example`.
- [ ] Turnstile de produção usa chaves reais, não as de teste: a chave do site em produção não começa com `1x0000`/`2x0000`/`3x0000`.
- [ ] Limite de 6 envios de correção por hora por hash responde `429` (comportamento testado em `lib/corrections`); teste manual opcional enviando 6 pedidos em sequência.

## 6. Acessibilidade e responsividade

- [ ] `npm run e2e` (`e2e/a11y.spec.ts`): zero violações sérias ou críticas do axe nas páginas cobertas, e sem rolagem horizontal em 375, 768 e 1280 px.
- [ ] Axe manual (extensão axe DevTools ou Lighthouse) em `/noticias`, `/analises`, `/historico`, `/sobre`, `/metodologia`, `/privacidade`, `/cookies`, `/corrigir`: sem violações sérias.
- [ ] Teclado: em `/votar`, Tab chega a "Sim", Espaço seleciona, o grupo de candidatos é alcançável, o botão "Registrar voto" fica habilitado depois do Turnstile e Enter envia. Foco visível em todos os elementos.
- [ ] Leitor de tela (NVDA no Windows ou VoiceOver): os gráficos de `/resultados` têm tabela equivalente e rótulo; o botão "Fonte e verificação" anuncia expandido/recolhido.
- [ ] Contraste: texto cinza claro sobre fundo branco passa 4,5:1 (Lighthouse > Accessibility ou DevTools > cor do texto).
- [ ] Celular real (Android e iPhone): `/`, `/votar`, `/resultados`, um perfil e `/comparador` sem rolagem lateral; botões com pelo menos 44 px de altura; Turnstile visível e utilizável.
- [ ] Zoom de 200% e fonte grande do sistema: nada some nem se sobrepõe.
- [ ] Lighthouse mobile na home e em `/resultados`: Acessibilidade e Boas práticas sem alertas relevantes. Notas: ____________

## 7. Operação

- [ ] Smoke test pós-implantação do `docs/deploy.md` (seção "Teste de fumaça") concluído.
- [ ] Variáveis de ambiente de Produção completas e diferentes das de Preview (Vercel > Settings > Environment Variables): cada linha de `.env.example` presente.
- [ ] `NEXT_PUBLIC_SITE_URL` é o domínio final com `https://` e sem barra final; `view-source:` da home mostra `canonical` e `og:url` com esse domínio.
- [ ] Domínio próprio com certificado válido (cadeado) e redirecionamento do `www` ou do domínio `.vercel.app` conforme a decisão tomada.
- [ ] HSTS: o cabeçalho já traz `preload` e `includeSubDomains`. Só envie o domínio à lista de preload (hstspreload.org) quando o domínio for definitivo e TODOS os subdomínios aceitarem HTTPS.
- [ ] Backup: Supabase > Database > Backups mostra backup recente (planos pagos têm backup diário; no plano gratuito faça `supabase db dump` antes do início e depois do fim da votação, guardando o arquivo fora do Git).
- [ ] Rollback ensaiado: Vercel > Deployments > implantação anterior > "Instant Rollback" (ou "Promote to Production") e volta ao atual. Migrações do banco são só para frente (ver `docs/deploy.md`).
- [ ] Alertas: e-mail de notificação da Vercel para falha de implantação e de cron ativo; pessoa responsável nos dias de votação: ____________
- [ ] Encerramento: em 12/12/2026 após 00:00 (Brasília), `/votar` mostra aviso de encerrada, `POST /api/vote` devolve `410`, `/resultados` não muda mais. Registre o total final: válidos ______ descartados ______ e salve uma captura de `/resultados` com data.
- [ ] Pós-encerramento: decisão registrada sobre manter o site no ar, e `voter_tokens` (mantido até o fim do período) apagado se não houver mais necessidade: `delete from public.voter_tokens;` (executar só no SQL Editor, com o dono do projeto, depois de congelar os resultados).
