begin;
select plan(21);

-- Candidato de teste vem do seed. Funcoes chamadas como postgres (dono).
select is(
  public.cast_vote('tok-a', (select id from public.candidates where slug = 'marcelo-teixeira'), true, 'hash-a', 'valid'),
  true, 'primeira chamada com um token novo devolve true');
select is((select count(*)::int from public.vote_events), 1, 'primeira chamada grava um vote_events');
select is(
  (select count(*)::int from public.vote_hashes h join public.vote_events e on e.id = h.vote_id
   where h.voter_hash = 'hash-a' and e.is_socio and e.flag = 'valid'
     and e.candidate_id = (select id from public.candidates where slug = 'marcelo-teixeira')),
  1, 'vote_hashes recebe uma linha ligada por vote_id com o voter_hash');
select is(
  (select count(*)::int from public.voter_tokens where token_hash = 'tok-a' and created_at is not null),
  1, 'voter_tokens recebe o token com created_at');

select is(
  public.cast_vote('tok-a', null, false, 'hash-b', 'valid'),
  false, 'segunda chamada com o mesmo token devolve false');
select is((select count(*)::int from public.vote_events), 1, 'segunda chamada rejeitada nao grava voto');
select is((select count(*)::int from public.vote_hashes), 1, 'segunda chamada rejeitada nao grava hash');
select is((select count(*)::int from public.voter_tokens), 1, 'segunda chamada rejeitada nao duplica token');

select is(
  public.cast_vote('tok-b', null, false, 'hash-b', 'suspicious'),
  true, 'candidato nulo (Branco/Indeciso) e aceito');
select is(
  (select count(*)::int from public.vote_events where candidate_id is null and flag = 'suspicious'),
  1, 'voto sem candidato guardou a flag suspicious');

select hasnt_column('public', 'vote_events', 'token_hash', 'vote_events nao tem coluna token_hash');
select hasnt_column('public', 'vote_events', 'voter_token', 'vote_events nao tem coluna voter_token');

select throws_ok(
  $$select public.cast_vote('tok-c', null, false, 'hash-c', 'bogus')$$,
  '22023'::char(5), 'flag invalida: bogus', 'flag fora de valid/suspicious levanta excecao');
select throws_ok(
  $$select public.cast_vote('tok-d', '00000000-0000-0000-0000-00000000dead', false, 'hash-d', 'valid')$$,
  '23503'::char(5),
  'insert or update on table "vote_events" violates foreign key constraint "vote_events_candidate_id_fkey"',
  'candidato inexistente levanta violacao de chave estrangeira');
select is((select count(*)::int from public.vote_events), 2, 'erros nao deixaram votos extras');

-- Privilegios de execucao
set local role anon;
select throws_ok(
  $$select public.cast_vote('tok-e', null, false, 'hash-e', 'valid')$$,
  '42501'::char(5), 'permission denied for function cast_vote', 'anon nao executa cast_vote');
reset role;
set local role authenticated;
select throws_ok(
  $$select public.cast_vote('tok-f', null, false, 'hash-f', 'valid')$$,
  '42501'::char(5), 'permission denied for function cast_vote', 'authenticated nao executa cast_vote');
reset role;
set local role service_role;
select is(
  public.cast_vote('tok-g', null, true, 'hash-g', 'valid'),
  true, 'service_role executa cast_vote');
select is(
  (select count(*)::int from public.vote_hashes where voter_hash = 'hash-g'),
  1, 'service_role consegue contar hashes recentes em vote_hashes');
reset role;

-- Anonimato por horario: o created_at do token e truncado ao dia e nao coincide
-- com o de nenhum vote_events (o instante da transacao so e meia-noite exata
-- com probabilidade desprezivel; o teste abaixo exige que o voto nao seja).
select is(
  not exists (select 1 from public.voter_tokens where created_at <> date_trunc('day', created_at)),
  true, 'voter_tokens.created_at fica exatamente a meia-noite');
select is(
  now() <> date_trunc('day', now())
  and not exists (
    select 1 from public.voter_tokens t join public.vote_events e on e.created_at = t.created_at),
  true, 'nenhum created_at de voter_tokens coincide com o de vote_events');

select * from finish();
rollback;
