# Observatório Santista 2026

Projeto independente sobre a eleição presidencial do Santos Futebol Clube em 2026.

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
$env:NEXT_PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000AAAAAAAAAAAAAAAAAA"
$env:TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
npx playwright test e2e/neutrality.spec.ts
```

A alteração de ponta a ponta feita pelo admin (com TOTP) é um procedimento manual: `docs/audit/2026-checklist.md`. Passo a passo de publicação: `docs/deploy.md`.

## Variáveis de ambiente

Veja `.env.example`. Em produção, defina `NEXT_PUBLIC_SITE_URL` com o domínio real (usado em sitemap, canonical e Open Graph); o padrão é um marcador.
