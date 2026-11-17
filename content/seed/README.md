# Conteúdo inicial (propostas em revisão)

Um arquivo JSON por candidato em `content/seed/`. Hoje há 4 entradas (uma por candidato), todas em revisão
(ver "Lote de 16/11/2026"). Só entra aqui o que veio de fonte verificável. Nunca preencha com texto de enchimento.

## Formato

```json
{
  "candidateSlug": "marcelo-teixeira",
  "entries": [ { ...entrada... } ]
}
```

Slugs de candidato: `marcelo-teixeira`, `mauricio-maruca`, `jose-renato-quaresma`, `ivan-luduvice`.
Slugs de tema: `futebol`, `financas`, `governanca-transparencia`, `estadio-patrimonio`, `base-formacao`,
`futebol-feminino`, `receitas-marketing`, `socios-torcida`, `estatuto-processo-eleitoral`.
Tipos (`sourceKind` e `kind` da fonte): `documento_da_chapa`, `entrevista_direta`, `reportagem`,
`declaracao_como_presidente`.

### FORMAT EXAMPLE (não copiar o conteúdo; a URL abaixo não resolve de propósito)

```json
{
  "candidateSlug": "marcelo-teixeira",
  "themeSlug": "futebol",
  "description": "EXEMPLO — não publicar",
  "sourceKind": "reportagem",
  "referenceYear": null,
  "sources": [
    {
      "url": "https://exemplo.invalid/materia",
      "outlet": "EXEMPLO — não publicar",
      "publishedOn": "2026-11-01",
      "consultedOn": "2026-11-16",
      "kind": "reportagem",
      "excerpt": "EXEMPLO — não publicar"
    }
  ]
}
```

Este exemplo existe só neste README. Nunca o coloque em um JSON de `content/seed/`.

## Regras

- Parafraseie. Citação literal entre aspas (retas, curvas ou « ») com **no máximo 14 palavras**; acima disso, ou com
  aspas não pareadas, o validador rejeita, em `description` e em `excerpt`.
- Toda entrada tem **ao menos uma fonte, com todos os campos preenchidos**: `url` (http:// ou https://),
  `outlet`, `publishedOn`, `consultedOn`, `kind`, `excerpt`. Datas em `aaaa-mm-dd`; `publishedOn` não pode ser posterior a `consultedOn`.
- `consultedOn` deve ser `2026-11-16` (data do lote atual, `RESEARCH_CONSULTED_ON`). Outra data é rejeitada por padrão.
- Material de 2023 ou anterior: `"referenceYear": 2023` (inteiro entre 2000 e 2026). Sem ano de referência: `null`.
- Chaves desconhecidas são rejeitadas. Em especial, **`status` não existe no JSON**: tudo é importado como
  `em_revisao`, sem exceção.
- `description` até 2000 caracteres, sem juízo de valor ("melhor candidato", "mais preparado",
  "mais promissor" e variações de gênero/número são rejeitados, em `description` e `excerpt`). Entradas repetidas (mesmo candidato, tema e descrição) são rejeitadas.
- Tema sem proposta fica **sem entrada**. Não escreva "sem proposta" nem texto de preenchimento.
- Publicação só pelo painel `/admin`, depois de verificar o trecho (`excerpt`) na fonte original.

### Nota de ponto pendente

Quando a citação ainda precisa ser conferida no original, termine o `excerpt` com o sufixo exato
` (citação a conferir no original)`. Remova a nota ao verificar, antes de publicar.

## Como rodar

```bash
npm run seed -- --dry-run          # valida os arquivos e mostra contagens; não grava nada
npm run seed                       # grava de verdade (precisa das variáveis abaixo)
npm run seed -- --dir content/seed # diretório alternativo
```

A gravação usa `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (nunca versionar; o script não as
imprime). Sem essas variáveis o script roda em dry-run. A importação é idempotente: proposta com mesmo
candidato, tema e descrição já existente é pulada. Requer Node 22.6 ou superior (`--experimental-strip-types`).

## Lote de 16/11/2026

As 24 entradas atuais (2 de Teixeira, 7 de Luduvice, 9 de Quaresma, 6 de Maruca) foram conferidas com o texto integral
das fontes (Gazeta Esportiva 12/11/2026, LANCE! 14/10/2026, Estadão 17/08/2026, A Crítica 04/11/2026 e plano de gestão
da chapa Quaresma), copiado por quem opera o projeto em 16/11/2026: cada trecho entre aspas aparece literalmente no texto
recebido. `consultedOn` é essa data. As propostas entram como `em_revisao`; antes de publicar em `/admin/propostas`,
abra o link e confirme que o trecho continua igual.

O plano de gestão de Quaresma (quaresmapresidentesfc.com/propostas) não traz data de publicação; usamos a data da consulta
(2026-11-16) em `publishedOn`. Confirme que o endereço abre antes de publicar.

Fora do lote: matérias da Máquina do Esporte, do Bolavip (nota da oposição sobre o estatuto, sem endereço confirmado) e do
LANCE! sobre Maruca. Afirmações que um resumo de IA trouxe e que não constam em nenhum texto recebido (CT em Praia Grande,
torcida única, ação de Maruca no TJ-SP, apoio de Teixeira ao estatuto, entre outras) não entram.
