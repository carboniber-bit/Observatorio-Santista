# Observatório Santista 2026

**Um projeto independente e sem fins lucrativos para acompanhar a eleição presidencial do Santos Futebol Clube em 2026.**
Reúne os candidatos, compara propostas **sempre com fonte pública verificável**, oferece uma **simulação informal e anônima** de intenção de voto e publica um **histórico aberto** de tudo o que muda no site.

Site: <https://observatorio-santista.vercel.app>

> Projeto independente, sem vínculo oficial com o Santos Futebol Clube, seus conselheiros, candidatos ou chapas.
> A votação é informal, **não é pesquisa eleitoral** e não substitui o processo eleitoral do clube.

Nasceu como projeto de aprendizado de um estudante de Análise e Desenvolvimento de Sistemas (ADS) e, por isso, foi construído como se fosse um produto real: com especificação, testes, revisão de código, auditoria de neutralidade e preocupação com privacidade. Este documento explica **o que** o site faz e, principalmente, **por que** cada decisão foi tomada.

---

## Sumário

1. [Princípios que guiam o projeto](#1-princípios-que-guiam-o-projeto)
2. [O que o site oferece](#2-o-que-o-site-oferece)
3. [Como a informação é tratada (regras editoriais)](#3-como-a-informação-é-tratada-regras-editoriais)
4. [A votação: desenho, limites e por quê](#4-a-votação-desenho-limites-e-por-quê)
5. [Privacidade e LGPD](#5-privacidade-e-lgpd)
6. [Segurança](#6-segurança)
7. [Arquitetura e escolhas técnicas](#7-arquitetura-e-escolhas-técnicas)
8. [Modelo de dados](#8-modelo-de-dados)
9. [Interface, acessibilidade e identidade visual](#9-interface-acessibilidade-e-identidade-visual)
10. [Como o projeto foi construído](#10-como-o-projeto-foi-construído)
11. [Limitações conhecidas (ditas com honestidade)](#11-limitações-conhecidas-ditas-com-honestidade)
12. [Rodando localmente](#12-rodando-localmente)
13. [Estrutura do repositório](#13-estrutura-do-repositório)
14. [Roadmap](#14-roadmap)
15. [Correções, contato e créditos](#15-correções-contato-e-créditos)

---

## 1. Princípios que guiam o projeto

Uma eleição de clube mobiliza paixão, e um site sobre ela só tem valor se as pessoas puderem **confiar** nele. Quatro princípios organizam todas as decisões:

| Princípio | O que significa na prática |
|---|---|
| **Independência** | Nenhum vínculo com o clube, candidatos ou chapas. A identidade visual não usa escudo nem marcas do Santos como se fosse oficial, e um aviso de independência fica visível em todas as páginas. |
| **Neutralidade verificável** | Os quatro candidatos têm exatamente as mesmas seções, na mesma ordem, com as mesmas classes visuais. Há uma lista de expressões proibidas ("melhor candidato", "mais preparado" etc.) que os testes procuram no conteúdo. Neutralidade aqui não é só intenção: é algo que se testa. |
| **Fonte para tudo** | Nenhuma proposta é publicada sem uma fonte pública com trecho literal conferido. Se não existe proposta pública verificável, o site diz isso, em vez de preencher com suposições. |
| **Privacidade por padrão** | A votação não coleta nome, CPF nem e-mail. O que é necessário para evitar abuso é guardado de forma anonimizada e apagado em poucos dias. |

Um quinto princípio atravessa os quatro: **auditabilidade**. Toda alteração editorial é registrada em um histórico público, com data e motivo.

## 2. O que o site oferece

- **Candidatos:** uma página por candidato, com as mesmas nove seções para todos. A situação da candidatura aparece de forma explícita ("A confirmar candidatura", "Desistiu da candidatura"), porque numa eleição em andamento chapas se formam e se desfazem.
- **Comparador de propostas:** tabela lado a lado por tema (finanças, futebol, governança, estádio e patrimônio, base, futebol feminino, receitas, sócios e torcida, estatuto e processo eleitoral). Quando não há proposta pública verificável, o campo diz isso.
- **Fonte e verificação:** cada proposta tem um botão que abre a fonte, o veículo, a data de publicação, a data de consulta e o trecho literal.
- **Votação informal e anônima**, com a pergunta "Você é sócio do Santos?", porque a eleição real só vale para sócios, mas o site é aberto a todos.
- **Resultados:** totais, votos por dia e gráfico Sócio × Não sócio, com filtro "Todos / Só sócios / Só não sócios". Os votos descartados por suspeita de abuso aparecem à parte, sem esconder.
- **Notícias e análises:** notícias de terceiros sempre com o selo e o link da fonte; análises separam *fatos*, *declarações dos candidatos* e *interpretação editorial*.
- **Histórico público de alterações:** quem acompanha vê o que mudou e por quê.
- **Metodologia, Sobre, Privacidade, Cookies e Pedir correção.**
- **Painel administrativo** protegido por login e autenticação em dois fatores.
- **Modo claro e escuro, ajuste do tamanho do texto e alto contraste.**

## 3. Como a informação é tratada (regras editoriais)

O comparador é a parte mais delicada do site, porque uma proposta mal atribuída pode prejudicar um candidato. Por isso o fluxo editorial é rígido:

1. **Toda proposta entra "em revisão".** A importação de conteúdo (`npm run seed`) só cria registros com essa situação, nunca "publicada", e é idempotente: rodar duas vezes não duplica.
2. **Fonte obrigatória.** Uma proposta só pode ser publicada se tiver ao menos uma fonte com trecho (`excerpt`) não vazio. Isso é imposto **no banco de dados** (regras e *triggers*), e não só na interface, para que um erro de código não derrube a garantia.
3. **Citação literal e curta.** Trechos entre aspas precisam aparecer exatamente na fonte e ter **no máximo 14 palavras**, por respeito a direitos autorais e para evitar citações fora de contexto. Um validador rejeita citações maiores, aspas desbalanceadas e frases de julgamento.
4. **Marcador de pendência.** Trechos ainda não conferidos no original ficam marcados com "(citação a conferir no original)", e o banco **bloqueia a publicação** enquanto a marca existir.
5. **Situações com histórico.** Uma proposta pode ser publicada, corrigida ou retirada, sempre com um motivo. Nada some sem rastro.
6. **Histórico público sem identificar autor.** O registro público mostra o que mudou, quando e por quê, e assina como "Equipe do Observatório". O autor individual não é exposto (a coluna `author` não faz parte das colunas públicas).
7. **Pedido de correção por qualquer pessoa**, sem cadastro.

**Por que tanto rigor?** Porque a credibilidade é o único ativo do projeto. Um único erro de atribuição, escondido, custa mais do que dezenas de campos vazios admitidos com honestidade. Também por isso o conteúdo foi conferido contra o texto integral das matérias, e afirmações de resumos automáticos que não constavam nas fontes ficaram de fora.

## 4. A votação: desenho, limites e por quê

A simulação é uma **brincadeira séria**: útil para medir o clima entre quem participa, mas sem pretensão estatística. O desenho tenta equilibrar três objetivos que se contradizem: **fácil de participar**, **difícil de manipular** e **sem coletar dados pessoais**.

- **Votos só são inseridos, nunca alterados.** A tabela de votos não aceita `UPDATE` nem `DELETE` pela aplicação. Nem o painel administrativo consegue editar um voto (há um teste que garante que o admin não escreve em votos).
- **Registro por função segura no banco** (`cast_vote`, `SECURITY DEFINER`), que também confere se a votação está aberta. A votação **abre** na data configurada e **encerra sozinha** às 00:00 de 12/12/2026 (horário de Brasília), sem ação humana.
- **Um voto por navegador:** um cookie assinado (`HttpOnly`, 90 dias) identifica o eleitor sem dados pessoais.
- **Defesa contra abuso sem guardar IP:** o servidor calcula um *hash* HMAC com um segredo e um "sal" diário a partir de IP e navegador. O hash muda todo dia, não permite descobrir o IP e é apagado após 7 dias. Mais de **5 votos por hora** do mesmo hash são marcados como **suspeitos** e separados, em vez de silenciosamente descartados.
- **Anti-robô:** Cloudflare Turnstile, sem quebra-cabeças para a pessoa resolver.
- **Quem desistiu da candidatura sai da cédula**, e o servidor recusa votos nele; os votos anteriores permanecem nos resultados.

**Por que não exigir login ou CPF?** Porque isso afastaria participantes e criaria um banco de dados pessoais que o projeto não tem como proteger com seriedade. A contrapartida é assumida: o site **não impede** que alguém vote de vários aparelhos. Por isso os resultados vêm sempre acompanhados do aviso de que não representam todos os torcedores.

## 5. Privacidade e LGPD

- **Não coletamos** nome, CPF, e-mail ou localização para votar.
- **Dados mínimos e com prazo de vida:** o hash de abuso é apagado em 7 dias; o campo de identificação em pedidos de correção também; e-mails opcionais de pedidos de correção são apagados 90 dias após o tratamento. Uma rotina diária de limpeza (agendada na Vercel) aplica essas regras.
- **Filtros de resultados não viram cookie:** a escolha do filtro fica só na URL.
- **Política de Privacidade e página de Cookies** em linguagem clara, com e-mail de contato real para exercer direitos.
- **Histórico público sem dados pessoais.**

## 6. Segurança

Pontos principais e a razão de cada um:

- **Banco com RLS (Row Level Security) e testes de banco (pgTAP).** As regras de acesso estão no PostgreSQL, não apenas no código da aplicação. Mesmo com um erro na interface, o banco recusa o que não deveria acontecer.
- **Painel admin com defesa em profundidade:** só entra quem tem login, autenticação em dois fatores (nível `aal2`) **e** está na lista de e-mails autorizados (`is_admin()`). A checagem acontece no *middleware* e de novo em **cada** página e ação. O painel usa a sessão do próprio administrador, sem chave de serviço privilegiada.
- **Cabeçalhos de segurança:** política de conteúdo (CSP), HSTS, bloqueio de iframes e outros, definidos em um único módulo testado (`lib/security-headers.ts`).
- **Segredos fora do Git:** chaves de serviço e segredos só existem como variáveis de ambiente. O *seed* de produção roda no computador de quem opera, com a chave definida apenas na sessão.
- **Rotinas protegidas:** endpoints de manutenção exigem um segredo (`CRON_SECRET`).
- **Validação de entradas** com Zod em todas as fronteiras.

## 7. Arquitetura e escolhas técnicas

| Camada | Tecnologia | Por que |
|---|---|---|
| Aplicação | **Next.js 15** (App Router) + **React 19** + **TypeScript** estrito | Renderização no servidor para páginas rápidas e indexáveis; um único repositório para site e API. |
| Estilo | **Tailwind CSS v4** (configuração em CSS) | Tokens de design em variáveis CSS: o modo escuro, o alto contraste e o tamanho do texto mudam o site inteiro sem reescrever componentes. |
| Banco e login | **Supabase** (PostgreSQL + Auth) | RLS nativa, TOTP para o admin e plano gratuito suficiente. |
| Gráficos | **Recharts** | Gráficos acessíveis e simples, com cores vindas das variáveis do tema. |
| Validação | **Zod** | Mesma validação no servidor e nos testes. |
| Testes | **Vitest** + Testing Library; **Playwright** + axe (e2e); **pgTAP** (banco) | Pirâmide de testes: regras de negócio, componentes, acessibilidade e garantias do banco. |
| Hospedagem | **Vercel** | Deploy contínuo a partir do GitHub, com agendador para a limpeza diária. |

**Custo zero de propósito.** O projeto roda inteiro nos planos gratuitos, sem domínio próprio obrigatório. Isso restringiu escolhas (por exemplo, o agendador gratuito da Vercel roda no máximo uma vez por dia), mas mostra que um projeto sério não depende de orçamento.

**Decisões que valem destacar**

- **Regras no banco, não só na interface.** O que não pode acontecer (publicar sem fonte, alterar voto) é impedido pelo PostgreSQL.
- **Conteúdo editorial em banco, com importação versionada.** As propostas conferidas ficam em `content/seed/*.json` (revisáveis no Git) e entram no banco como "em revisão".
- **Uma Server Action por botão** nos formulários do admin. Em React 19/Next 15, o valor do botão que envia um formulário pode não chegar ao servidor; fixar a operação em cada ação eliminou o erro "Operação inválida".
- **Componentes sem estado quando possível**, e as poucas partes interativas (tema e tamanho do texto) isoladas em um componente cliente.

## 8. Modelo de dados

Visão simplificada das principais entidades (veja `supabase/migrations/` para o esquema completo):

- **`candidates`**: candidatos, situação da candidatura e dados de perfil.
- **`themes`**: os nove temas do comparador (fixos e conferidos por teste contra o `seed.sql`).
- **`proposals`** e **`proposal_sources`**: propostas com situação (`em_revisao`, `publicada`, `corrigida`, `retirada`) e suas fontes (URL, veículo, datas, tipo, trecho).
- **`news`** e **`analyses`**: notícias de terceiros e análises próprias, com situação e histórico.
- **`change_log`**: histórico de alterações (a visão pública omite o autor).
- **`vote_events`** (somente inserção), **`voter_tokens`** e funções de resultado.
- **`correction_requests`**: pedidos de correção, com prazo de retenção.
- **`admin_allowlist`**: e-mails autorizados a administrar.

As migrações **0001–0007** são aplicadas em ordem: núcleo, regras editoriais, registro de voto, resultados, limpeza de dados, proteção de fontes e travas de publicação.

## 9. Interface, acessibilidade e identidade visual

- **Visual minimalista e moderno:** cantos arredondados, bastante espaço em branco, hierarquia clara e a votação em destaque na página inicial.
- **Modo claro, escuro ou automático** (segue o sistema), lembrado entre visitas, sem "piscar" ao carregar.
- **Tamanho do texto ajustável** (A− / A+, até 150%) e **alto contraste**, que funciona também no escuro.
- **Acessibilidade como requisito:** contraste mínimo 4,5:1, alvos de toque de pelo menos 44 px, foco visível, navegação por teclado, respeito a "reduzir movimento" e verificação automática com axe.
- **Cores com significado, mas nunca só cor:** quem desistiu da candidatura aparece em vermelho **e** com o aviso escrito.
- **Identidade própria:** a logo (escudo, estrela e uma orca no olho) é do projeto e do seu autor. O site evita imitar comunicação oficial do clube.

## 10. Como o projeto foi construído

O desenvolvimento seguiu um processo deliberado, parecido com o de uma equipe pequena:

1. **Pesquisa e verificação** de quem são os candidatos e do que há publicado, sem presumir candidaturas.
2. **Especificação e plano de 16 tarefas** (`docs/superpowers/`).
3. **Execução por tarefas**, cada uma implementada, testada e **revisada** (conformidade com a especificação e qualidade do código) antes de seguir.
4. **Revisão final da branch inteira**, com correções.
5. **Auditoria de neutralidade e checklist de lançamento** (`e2e/neutrality.spec.ts`, `docs/audit/2026-checklist.md`).
6. **Implantação guiada** (`docs/deploy.md`) e **teste de fumaça** em produção.

Trabalho assistido por IA (Claude, da Anthropic) foi usado para escrever código e revisar, sob supervisão e validação do autor, que rodou os testes e a implantação. As decisões editoriais e de produto são humanas.

## 11. Limitações conhecidas (ditas com honestidade)

- **A simulação não é uma pesquisa.** Quem participa é quem chega ao site (autosseleção), e nada impede que alguém vote de vários aparelhos. Os resultados valem como termômetro informal, não como previsão.
- **Cobertura de propostas desigual.** Há candidatos com muito mais material público do que outros, e alguns temas estão sem proposta verificável. O site mostra essas lacunas em vez de escondê-las, mas elas existem.
- **Dados de uma eleição em movimento.** Chapas mudam (houve desistências e fusões durante o desenvolvimento). O histórico público registra as mudanças, mas pode haver defasagem de horas.
- **Conteúdo depende de fontes públicas** e do tempo de quem mantém o projeto, que é uma pessoa só.
- **Um único administrador.** É uma escolha de simplicidade e também um ponto único de falha.

## 12. Rodando localmente

Pré-requisitos: Node.js 20 ou superior e um projeto Supabase (pode ser um de teste).

```bash
git clone https://github.com/carboniber-bit/Observatorio-Santista.git
cd Observatorio-Santista
npm install
cp .env.example .env.local   # preencha as variáveis (veja abaixo)
npm run dev                   # http://localhost:3000
```

1. Aplique as migrações de `supabase/migrations/` (0001 a 0007) e o `supabase/seed.sql`.
2. Para importar as propostas conferidas: `npm run seed -- --dry-run` (valida sem gravar) e `npm run seed` (grava como "em revisão"; exige `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` apenas na sua sessão).
3. Publicação em produção: siga [`docs/deploy.md`](docs/deploy.md).

**Nunca** coloque chaves de serviço, segredos ou arquivos `.env*` no Git.

## 13. Estrutura do repositório

```
app/            páginas e rotas (App Router): públicas, /admin e /api
components/     componentes de interface (home, comparador, votação, gráficos, acessibilidade)
lib/            regras de negócio: votação, editorial, admin, resultados, segurança, SEO
content/seed/   propostas conferidas por candidato (JSON versionado)
scripts/        importação (seed) e seus testes
supabase/       migrações SQL, seed e testes de banco
e2e/            testes ponta a ponta e auditoria de neutralidade
docs/           guia de implantação, checklist de auditoria, especificação e plano
public/         logo e imagens
```

## 14. Roadmap

- **Santista NewsBot (planejado):** coletor gratuito de notícias por RSS com **fila de aprovação manual**. Nada é publicado sem aprovação do administrador, e o robô guarda apenas título, link, veículo, data e um resumo curto, sem copiar matérias.
- Mais cartões e hierarquia visual nas páginas internas.
- Completar propostas nos temas ainda vazios, conforme surgirem fontes públicas.
- Congelar os resultados como histórico depois de 12/12/2026.

## 15. Correções, contato e créditos

- **Encontrou um erro?** Use o formulário **Pedir correção** no site; o pedido é analisado e, se aceito, registrado no histórico público.
- **Observações ou reclamações:** observatoriosantista2026@gmail.com
- **Desenvolvimento e design:** [Carboni Digital Business](https://carboni-digital-bussiness.lovable.app/)
- **Licença:** ainda não definida; enquanto isso, todos os direitos são reservados ao autor.

---

## Testes

- Unitários e de componentes: `npm test` (vitest).
- Ponta a ponta (acessibilidade com axe, cabeçalhos de segurança, sitemap e robots): primeiro `npx playwright install chromium`, depois `npm run e2e`. O Playwright compila e inicia o site na porta 3000 (`npm run build && npm run start`), então as variáveis de ambiente de `.env.example` precisam estar definidas. O envio de voto por teclado depende do Turnstile e não é automatizado sem a chave de teste da Cloudflare.

### Auditoria de neutralidade (`e2e/neutrality.spec.ts`)

Precisa de um site no ar com o Supabase de TESTE semeado (`supabase/seed.sql`). Sem `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente do processo de teste, todos os testes são pulados com o motivo na tela (o Playwright não lê `.env.local`; exporte as variáveis no terminal). Verifica: mesmas seções nos 4 perfis, nenhuma expressão proibida nas páginas públicas, botão `Fonte e verificação` em toda proposta publicada.

O teste de votação ponta a ponta grava um voto real e só roda com as chaves de teste da Cloudflare, definidas ANTES de compilar (a chave do site é embutida no build; nunca publique um build feito com elas):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO-DE-TESTE.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
$env:SUPABASE_SERVICE_ROLE_KEY="..."
$env:VOTE_HASH_SECRET="qualquer-texto-longo-de-teste"
$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
$env:TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
npx playwright test e2e/neutrality.spec.ts
```

A alteração de ponta a ponta feita pelo admin (com TOTP) é um procedimento manual: `docs/audit/2026-checklist.md`. Passo a passo de publicação: `docs/deploy.md`.

## Variáveis de ambiente

Veja `.env.example`. Em produção, defina `NEXT_PUBLIC_SITE_URL` com o domínio real (usado em sitemap, canonical e Open Graph); o padrão é um marcador.
