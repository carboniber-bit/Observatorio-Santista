# Observatório Santista 2026

Projeto independente sobre a eleição presidencial do Santos Futebol Clube em 2026.

## Testes

- Unitários e de componentes: `npm test` (vitest).
- Ponta a ponta (acessibilidade com axe, cabeçalhos de segurança, sitemap e robots): primeiro `npx playwright install chromium`, depois `npm run e2e`. O Playwright compila e inicia o site na porta 3000 (`npm run build && npm run start`), então as variáveis de ambiente de `.env.example` precisam estar definidas. O envio de voto por teclado depende do Turnstile e não é automatizado sem a chave de teste da Cloudflare.

## Variáveis de ambiente

Veja `.env.example`. Em produção, defina `NEXT_PUBLIC_SITE_URL` com o domínio real (usado em sitemap, canonical e Open Graph); o padrão é um marcador.
