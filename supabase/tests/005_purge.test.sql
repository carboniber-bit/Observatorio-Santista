begin;
select plan(16);

-- Fixtures (como postgres/dono): dois votos com hash de 8 e de 6 dias, dois tokens.
insert into public.vote_events (id, candidate_id, is_socio, flag, created_at) values
  ('00000000-0000-4000-8000-0000000000a8', null, true, 'valid', now() - interval '8 days'),
  ('00000000-0000-4000-8000-0000000000a6', null, false, 'valid', now() - interval '6 days');
insert into public.vote_hashes (vote_id, voter_hash, created_at) values
  ('00000000-0000-4000-8000-0000000000a8', 'hash-8d', now() - interval '8 days'),
  ('00000000-0000-4000-8000-0000000000a6', 'hash-6d', now() - interval '6 days');
insert into public.voter_tokens (token_hash, created_at) values
  ('tok-old', now() - interval '100 days'), ('tok-new', date_trunc('day', now()));

-- Pedidos de correção.
insert into public.correction_requests (body, email, status, handled_at, created_at, submitter_hash) values
  ('tratada 91d',    'a@exemplo.test', 'tratada', now() - interval '91 days', now() - interval '100 days', 'sub-91'),
  ('tratada 89d',    'b@exemplo.test', 'tratada', now() - interval '89 days', now() - interval '100 days', null),
  ('nova antiga',    'c@exemplo.test', 'nova',    null,                       now() - interval '200 days', null),
  ('enviada 8d',     'd@exemplo.test', 'nova',    null,                       now() - interval '8 days',   'sub-8d'),
  ('enviada 6d',     'e@exemplo.test', 'nova',    null,                       now() - interval '6 days',   'sub-6d');

select public.purge_expired();

select is((select count(*)::int from public.vote_hashes where voter_hash = 'hash-8d'), 0,
  'vote_hashes com 8 dias e apagado');
select is((select count(*)::int from public.vote_hashes where voter_hash = 'hash-6d'), 1,
  'vote_hashes com 6 dias e mantido');

select is((select email from public.correction_requests where body = 'tratada 91d'), null,
  'correcao tratada ha 91 dias perde o e-mail');
select is((select count(*)::int from public.correction_requests where body = 'tratada 91d'), 1,
  'correcao tratada ha 91 dias mantem a linha e o texto');
select is((select email from public.correction_requests where body = 'tratada 89d'), 'b@exemplo.test',
  'correcao tratada ha 89 dias mantem o e-mail');
select is((select email from public.correction_requests where body = 'nova antiga'), 'c@exemplo.test',
  'correcao antiga sem tratamento (handled_at nulo) mantem o e-mail');

select is((select submitter_hash from public.correction_requests where body = 'tratada 91d'), null,
  'submitter_hash de pedido com mais de 7 dias e zerado (100 dias)');
select is((select submitter_hash from public.correction_requests where body = 'enviada 8d'), null,
  'submitter_hash com 8 dias e zerado');
select is((select submitter_hash from public.correction_requests where body = 'enviada 6d'), 'sub-6d',
  'submitter_hash com 6 dias e mantido');

select is((select count(*)::int from public.vote_events), 2, 'vote_events nao foi tocada');
select is((select count(*)::int from public.voter_tokens), 2, 'voter_tokens nao foi tocada');

-- Idempotencia: uma segunda execucao nao muda mais nada.
create temp table snap as
  select (select md5(coalesce(string_agg(vote_id::text || voter_hash, ',' order by vote_id), '')) from public.vote_hashes) as h,
         (select md5(coalesce(string_agg(body || coalesce(email, '-') || coalesce(submitter_hash, '-'), ',' order by body), '')) from public.correction_requests) as c;
grant all on snap to public;
select public.purge_expired();
select is(
  (select md5(coalesce(string_agg(vote_id::text || voter_hash, ',' order by vote_id), '')) from public.vote_hashes),
  (select h from snap), 'segunda execucao nao altera vote_hashes');
select is(
  (select md5(coalesce(string_agg(body || coalesce(email, '-') || coalesce(submitter_hash, '-'), ',' order by body), '')) from public.correction_requests),
  (select c from snap), 'segunda execucao nao altera correction_requests');

-- Privilegios de execucao
set local role anon;
select throws_ok($$select public.purge_expired()$$, '42501'::char(5),
  'permission denied for function purge_expired', 'anon nao executa purge_expired');
reset role;
set local role authenticated;
select throws_ok($$select public.purge_expired()$$, '42501'::char(5),
  'permission denied for function purge_expired', 'authenticated nao executa purge_expired');
reset role;
set local role service_role;
select lives_ok($$select public.purge_expired()$$, 'service_role executa purge_expired');
reset role;

select * from finish();
rollback;
