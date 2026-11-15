# Guia de implantação: Observatório Santista 2026

Passo a passo para quem nunca publicou um site. Faça na ordem. Reserve umas 2 horas na primeira vez. Use **dois ambientes**: um de TESTE (Preview na Vercel + um projeto Supabase de teste) e o de PRODUÇÃO. Só publique em produção depois de passar no teste de fumaça (seção 13) no ambiente de teste.

Ferramentas no seu computador: Node.js 22, Git, [Supabase CLI](https://supabase.com/docs/guides/cli), conta no GitHub (o repositório já está lá), e contas gratuitas em Supabase, Vercel e Cloudflare.

> Segredos (`SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `VOTE_HASH_SECRET`, `CRON_SECRET`): nunca em arquivo versionado, nunca em mensagem de commit, nunca em print. `.env.local` já está no `.gitignore`.

Nota sobre a Vercel: o plano Hobby é para uso pessoal e não comercial. O site é independente e sem fins lucrativos; se isso mudar, reveja o plano.

## 1. Projeto no Supabase (região São Paulo)

1. Em supabase.com, **New project**. Nome: `observatorio-santista` (e outro, `observatorio-santista-teste`, para o ambiente de teste).
2. **Region: South America (São Paulo)**. Escolha uma senha forte para o banco e guarde-a no gerenciador de senhas.
3. Espere o projeto ficar pronto (alguns minutos).
4. Em **Project Settings > API** anote, para usar na seção 5:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - chave **anon** (pública) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - chave **service_role** (SECRETA) → `SUPABASE_SERVICE_ROLE_KEY`

   Se o painel mostrar só as chaves novas (`publishable`/`secret`), procure a aba "Legacy API keys" para copiar `anon` e `service_role`, que são as usadas por este código.

## 2. Migrações do banco (0001 a 0007)

No terminal, na pasta do projeto:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF   # o código fica na URL do painel e em Settings > General
supabase db push
```

O `db push` aplica, em ordem, `supabase/migrations/0001_core.sql` até `0007_publish_guards.sql` (tabelas, regras editoriais, voto, resultados, limpeza, proteção de fontes e barreiras finais de publicação e encerramento). Ele pede a senha do banco da etapa 1. Confira em **Table Editor** que existem `candidates`, `themes`, `proposals`, `sources`, `vote_events` etc.

Repita com `supabase link` apontando para o projeto de teste quando for preparar o ambiente de teste.

**Migrações só andam para frente.** Não edite um arquivo já aplicado: crie `0008_...sql`.

## 3. Dados iniciais (`supabase/seed.sql`)

O `db push` NÃO roda o seed em projeto hospedado. Abra **SQL Editor > New query**, cole todo o conteúdo de `supabase/seed.sql` e execute **uma única vez**. Ele cria os 4 candidatos (todos "a confirmar") e os 9 temas. Não é idempotente: rodar de novo duplica ou dá erro de chave repetida. Confira:

```sql
select count(*) from public.candidates;  -- 4
select count(*) from public.themes;      -- 9
```

## 4. Autenticação e administrador

Em **Authentication** (os nomes de menu podem variar um pouco conforme o painel):

1. **Sign In / Providers > Email**: mantenha **"Confirm email" LIGADO**. Isso impede que alguém cadastre um e-mail que ainda não confirmou.
2. Crie o administrador: **Users > Add user > Create new user**, com seu e-mail e uma senha longa e única. Marque **Auto Confirm User** (é a sua própria conta, criada por você).
3. **Desative o cadastro público**: em Sign In / Providers, desligue **"Allow new users to sign up"**. Faça isso logo depois de criar o admin, antes de divulgar o site.
4. Autorize o e-mail como admin, no **SQL Editor** (e-mail em **minúsculas**):
   ```sql
   insert into public.admin_allowlist (email) values ('seu-email@exemplo.com');
   ```
   Sem essa linha ninguém é admin, mesmo com conta.
5. **TOTP (segundo fator)**: confirme em Authentication > Multi-Factor que TOTP está habilitado. Depois do deploy, **imediatamente** entre em `https://SEU-SITE/admin/login`, faça login e cadastre o autenticador (Google Authenticator, Authy etc.) em `/admin/mfa`. Até o TOTP estar cadastrado, qualquer sessão só tem nível 1 e o painel não libera edições, mas não deixe isso para depois: cadastre antes de divulgar o site.
6. Em **URL Configuration**, defina **Site URL** como o endereço final do site (`https://seudominio.com.br`).

## 5. Projeto na Vercel e variáveis de ambiente

1. Em vercel.com, **Add New > Project**, importe o repositório do GitHub. Framework: Next.js (detectado). Branch de produção: `main` (faça o merge de `feat/observatorio-2026` antes, ou escolha a branch no projeto).
2. Em **Settings > Environment Variables**, cadastre as variáveis abaixo. Cada uma tem três escopos: **Production**, **Preview**, **Development**. Use valores de TESTE em Preview e valores REAIS em Production.

| Variável | Onde obter | Preview (teste) | Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API > Project URL | projeto de teste | projeto real |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API > anon | do projeto de teste | do projeto real |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API > service_role (SECRETA) | do projeto de teste | do projeto real |
| `VOTE_HASH_SECRET` | você gera (abaixo) | um valor | OUTRO valor |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (seção 6) | `1x0000000000000000000000000000000AA` (teste) | chave secreta real |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile (seção 6) | `1x00000000000000000000AA` (teste) | chave do site real |
| `NEXT_PUBLIC_SITE_URL` | seu endereço público | URL do preview, ou deixe vazio | `https://seudominio.com.br` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | e-mail que você monitora | pode repetir | e-mail real (obrigação da LGPD) |
| `CRON_SECRET` | você gera (abaixo) | um valor | OUTRO valor |
| `VOTING_OPENS_AT` | você define | no passado, p.ex. `2026-01-01T00:00:00-03:00` | data real, ver abaixo |

**Como gerar `VOTE_HASH_SECRET` e `CRON_SECRET`** (rode duas vezes, um valor para cada, e guarde no gerenciador de senhas):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No PowerShell também funciona o mesmo comando. Trocar o `VOTE_HASH_SECRET` depois da abertura invalida os cookies de eleitor já emitidos (permitindo votar de novo): defina uma vez e não mude.

**`VOTING_OPENS_AT` com fuso explícito.** Escreva sempre o deslocamento `-03:00`:

```
VOTING_OPENS_AT=2026-12-01T00:00:00-03:00
```

Sem o `-03:00` o servidor da Vercel (UTC) leria a hora errada e a votação abriria 3 horas tarde (ou, se mal escrita, ficaria fechada: valor inválido fecha por segurança). Se a variável ficar vazia, a votação fica aberta desde já. A votação **encerra sozinha** em 12/12/2026 às 00:00 de Brasília (11/12 às 23:59), sem nenhuma ação sua.

**Variáveis `NEXT_PUBLIC_*` são embutidas na hora do build.** Se mudar uma delas (por exemplo, a chave do site do Turnstile ou `NEXT_PUBLIC_SITE_URL`), faça um novo deploy (Deployments > ⋯ > Redeploy) para valer.

3. **Deploy**. A primeira publicação gera um endereço `https://nome-do-projeto.vercel.app`.

## 6. Cloudflare Turnstile (anti-robô)

1. Em dash.cloudflare.com > **Turnstile > Add widget**.
2. Nome: `Observatório Santista`. **Hostname**: o domínio final (`seudominio.com.br`) e, se for testar com ele, o `nome-do-projeto.vercel.app`. Modo: **Managed**.
3. Copie a **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e a **Secret Key** → `TURNSTILE_SECRET_KEY` (somente Production). Em Preview use as chaves de teste da tabela acima: elas sempre aprovam e nunca devem ir para produção.
4. Redeploy, porque a chave do site é lida no build.

## 7. Cron de limpeza (já configurado)

O arquivo `vercel.json` já tem:

```json
{ "crons": [{ "path": "/api/cron/purge", "schedule": "0 6 * * *" }] }
```

Roda uma vez por dia às 06:00 UTC (03:00 em Brasília), o que atende o limite do plano Hobby (no máximo uma execução por dia). A rota `/api/cron/purge` confere `Authorization: Bearer $CRON_SECRET`: a Vercel envia esse cabeçalho sozinha quando a variável `CRON_SECRET` existe no projeto, então basta cadastrá-la. A tarefa apaga hashes de voto com mais de 7 dias e e-mails antigos de pedidos de correção. Crons só rodam na implantação de **Produção**. Veja em Settings > Cron Jobs; o botão "Run" permite testar. Sem `CRON_SECRET` a rota responde 500 e nada é apagado.

## 8. Domínio próprio e DNS

1. Compre o domínio (Registro.br para `.com.br`, ou outro registrador).
2. Na Vercel: **Settings > Domains > Add**, digite `seudominio.com.br`. A Vercel mostra os registros exatos a criar:
   - domínio raiz (`seudominio.com.br`): registro **A** apontando para o IP indicado pela Vercel (costuma ser `76.76.21.21`);
   - `www`: registro **CNAME** apontando para o valor indicado (`cname.vercel-dns.com` ou o que o painel mostrar).
3. Crie esses registros no painel DNS do seu registrador (Registro.br: "Editar zona" se usar o DNS deles). Use sempre os valores que a Vercel exibir, não os deste guia.
4. Aguarde a propagação (minutos a algumas horas) e a emissão do certificado TLS: a Vercel mostra "Valid Configuration" e o site passa a abrir com cadeado em `https://`.
5. Escolha um domínio principal e deixe o outro redirecionar para ele (a Vercel oferece isso na própria tela).
6. Ajuste `NEXT_PUBLIC_SITE_URL` (Production) para `https://seudominio.com.br`, o Site URL do Supabase (seção 4, passo 6) e a lista de hostnames do Turnstile; faça redeploy.

**Cuidado com HSTS preload.** O site já envia `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. Isso obriga os navegadores que já visitaram o domínio a usar só HTTPS, por 2 anos, inclusive em subdomínios. Só envie o domínio para a lista de preload do Chrome (hstspreload.org) quando o domínio estiver definitivo e todos os subdomínios aceitarem HTTPS; remover da lista depois leva meses.

## 9. Endereço IP do eleitor: por que é seguro

O limite de votos por hora usa o IP lido do cabeçalho `X-Forwarded-For`. Esse cabeçalho pode ser forjado por quem acessa direto um servidor comum, mas **a Vercel sobrescreve `X-Forwarded-For`** com o IP real da conexão antes de a requisição chegar ao código; um valor enviado pelo visitante é descartado. Por isso o primeiro endereço do cabeçalho é confiável **desde que o site rode na Vercel**. Se um dia colocar outro proxy ou CDN na frente (por exemplo, Cloudflare com proxy laranja), reveja `lib/voting/ip.ts` antes. O IP nunca é gravado: entra só num hash diário irreversível, apagado em 7 dias.

## 10. Conteúdo: importar e publicar propostas

Hoje `content/seed/*.json` está **vazio**: nenhuma proposta foi cadastrada, e o site mostra "Não foi localizada proposta pública verificável." em todos os temas. Só inclua o que tiver fonte verificável (formato e regras em `content/seed/README.md`).

1. Preencha os JSONs (URL, veículo, datas, tipo e trecho comprobatório de cada fonte; citação literal de até 14 palavras).
2. No seu computador, crie `.env.local` (não versionado) com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do projeto **desejado**. Atenção: a chave service_role ignora todas as regras de acesso; use só aqui e apague o arquivo depois, se preferir.
3. Teste sem gravar: `npm run seed -- --dry-run` (informa quantas entradas são válidas e aponta erros).
4. Importe de verdade: `npm run seed`. Tudo entra com a situação **em revisão**: nada vira público sozinho. Rodar de novo pula o que já existe.
5. No site, entre em `/admin/login`, conclua o TOTP e abra **/admin/propostas**. Para cada proposta: confira a fonte no original, abra "Mudar situação", escreva o motivo e clique **Publicar**. O banco recusa a publicação sem fonte com trecho. Se o trecho ainda diz "(citação a conferir no original)", confira e corrija a fonte antes de publicar.
6. Conferido o resultado em `/candidatos/<slug>` e em `/historico`.

## 11. Checklist do primeiro admin

- [ ] Usuário criado em Authentication > Users (e-mail confirmado).
- [ ] E-mail em **minúsculas** em `admin_allowlist`.
- [ ] Cadastro público **desativado** e "Confirm email" **ligado**.
- [ ] Login em `/admin/login` funcionou e o TOTP foi cadastrado em `/admin/mfa` (código de recuperação ou QR guardado em local seguro).
- [ ] `/admin` sem login redireciona para `/admin/login`.
- [ ] Uma edição de teste com motivo apareceu em `/historico` (procedimento em `docs/audit/2026-checklist.md`).

## 12. Reversão (rollback)

- **Código/site:** Vercel > Deployments > escolha a implantação anterior boa > **Instant Rollback** (ou "Promote to Production"). Demora segundos. Não mexe no banco.
- **Banco:** migrações só avançam. Para desfazer uma mudança de estrutura, escreva uma nova migração que a reverta (`0008_...sql`) e rode `supabase db push`. Para um desastre de dados, restaure o backup em Supabase > Database > **Backups** (planos pagos: restauração para um ponto no tempo) ou, no plano gratuito, importe o arquivo gerado antes com `supabase db dump -f backup.sql` (faça um dump antes de mudanças grandes e no encerramento da votação; guarde fora do Git, pois ele contém os votos). Restaurar volta TODOS os dados ao ponto escolhido, inclusive votos posteriores: use só em último caso.
- Variáveis erradas: corrija em Environment Variables e faça Redeploy.

## 13. Teste de fumaça pós-implantação

Em janela anônima, no endereço final:

| Endereço | O que ver |
|---|---|
| `/` | Home carrega, nome do site, link para votar e resultados. |
| `/candidatos/marcelo-teixeira` (e os outros 3) | 9 seções iguais; temas sem proposta mostram "Não foi localizada proposta pública verificável." |
| `/comparador` | Tabela com os 4 candidatos; seleção por caixas funciona. |
| `/votar` | Pergunta "Você é sócio do Santos?", candidatos em ordem alfabética, Turnstile aparece. No ambiente de teste: vote e veja "Voto registrado. Obrigado por participar!". Em produção, não vote de verdade antes da abertura: `vote_events` é imutável para a aplicação, então um voto de teste ficaria contado. Antes da abertura confira apenas o aviso "A votação ainda não foi aberta." (com `VOTING_OPENS_AT` no futuro). |
| `/resultados` | Totais, votos por dia, pizza Sócio × Não sócio, "Votos descartados". |
| `/noticias`, `/analises`, `/historico` | Carregam sem erro; histórico sem e-mails. |
| `/sobre`, `/metodologia`, `/privacidade`, `/cookies`, `/corrigir` | Carregam; `/privacidade` mostra o e-mail de contato. |
| `/admin` | Redireciona para `/admin/login`. |
| `/robots.txt` e `/sitemap.xml` | `/admin` e `/api/` bloqueados; sitemap sem `/admin`, com o domínio final. |
| `/api/cron/purge` | Sem credencial: `401`. |
| Cadeado e cabeçalhos | `curl -sI https://SEU-DOMINIO/` traz `content-security-policy` e `strict-transport-security`. |

Depois, percorra `docs/audit/2026-checklist.md`.

## 14. Encerramento da votação

Automático: a partir de 12/12/2026 às 00:00 em Brasília (isto é, 11/12 às 23:59), `/api/vote` recusa votos (`410`), `/votar` mostra o aviso de encerramento e `/resultados` fica congelado, sem nenhuma ação sua. Depois: salve o dump do banco, registre o total final e decida se mantém o site no ar. Mantenha o cron ativo até lá para a limpeza dos hashes continuar rodando.

## 15. LGPD e contato

Defina `NEXT_PUBLIC_CONTACT_EMAIL` em Production com uma caixa que você leia. É por esse e-mail que `/privacidade` informa que titulares exercem seus direitos (Lei 13.709/2018). Sem ele a página remete ao formulário `/corrigir`, o que funciona mas é menos direto. O controlador dos dados é você, pessoa física; trate pedidos em até 15 dias.

## 16. Testes ponta a ponta (opcional, para você rodar)

Veja `README.md`, seção "Auditoria de neutralidade". Use sempre o projeto Supabase de **teste** e as chaves de teste do Turnstile. Nunca publique em produção um build feito com chaves de teste.

## Perguntas frequentes e erros comuns

**O cookie de eleitor não é gravado em `http://`.** Em produção o cookie `os26_voter` é `Secure` e só funciona em HTTPS. `localhost` costuma ser aceito pelos navegadores; um IP da rede local (`http://192.168...`) não. Teste sempre no endereço `https://` da Vercel.

**O botão "Registrar voto" fica desabilitado.** Falta responder "Sim/Não", escolher uma opção, ou o Turnstile não concluiu. Verifique: a chave do site está no build (redeploy depois de mudar), o domínio está na lista de hostnames do widget, e nenhum bloqueador de anúncios impede `challenges.cloudflare.com`. Com chaves de teste em um site real o desafio "aprova" qualquer um: confira que Production usa as chaves reais.

**Erro 429 ao enviar um pedido de correção.** Foi atingido o limite de 5 pedidos por hora por hash; espere uma hora. O voto NÃO devolve 429: o 6º voto na mesma hora, vindo do mesmo hash de rede, é gravado como suspeito (a pessoa ainda vê "Voto registrado") e fica fora dos totais, aparecendo só em "Votos descartados". Em redes compartilhadas (universidade, escritório) isso pode afetar mais de uma pessoa; por isso o voto suspeito é apenas contado à parte, nunca apagado.

**A votação abriu na hora errada / ficou fechada.** `VOTING_OPENS_AT` sem `-03:00`, com formato inválido (inválido = fechada) ou com a data no futuro. Corrija a variável e faça redeploy.

**O código TOTP é recusado.** Quase sempre o relógio do celular está fora de hora. Ative a hora automática do celular e tente o código seguinte. Se perdeu o autenticador, remova o fator em Supabase > Authentication > Users > (usuário) > fatores MFA e cadastre outro em `/admin/mfa`.

**Entrei no `/admin` e voltei para o login.** E-mail não está em `admin_allowlist` (em minúsculas), conta sem e-mail confirmado, ou o TOTP ainda não foi concluído nesta sessão.

**`supabase db push` pede senha ou falha ao conectar.** Use a senha do banco da etapa 1 (não a do painel). Esqueceu: Project Settings > Database > Reset database password.

**Sitemap e links mostram `observatorio-santista.vercel.app`.** `NEXT_PUBLIC_SITE_URL` não foi definida em Production (o padrão é só um marcador). Defina e faça redeploy.

**O cron não roda.** Só roda em Produção, exige `CRON_SECRET` cadastrada e o projeto precisa ter sido implantado depois de `vercel.json` existir. Veja Settings > Cron Jobs.
