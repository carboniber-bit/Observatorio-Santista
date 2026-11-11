begin;
select plan(38);

-- Sem votos: uma linha por candidato (4) mais a linha nula, tudo zerado.
select is((select count(*)::int from public.get_results('all')), 5, 'sem votos: 4 candidatos mais a linha Branco/Indeciso');
select is((select count(*)::int from public.get_results('all') where votes <> 0), 0, 'sem votos: todas as linhas valem 0');
select is((select count(*)::int from public.get_results('all') where candidate_id is null), 1, 'sem votos: exatamente uma linha nula (Branco/Indeciso)');
select is((select public.get_last_vote_at()), null::timestamptz, 'sem votos: get_last_vote_at devolve null');
select is((select socio::int || '/' || nao_socio::int from public.get_socio_split()), '0/0', 'sem votos: divisao socio/nao socio e 0/0');
select is(public.get_discarded_count()::int, 0, 'sem votos: nenhum descartado');
select is((select count(*)::int from public.get_daily_series('all')), 0, 'sem votos: serie diaria vazia');

-- Fixtures (inseridas como dono; created_at explicito).
insert into public.vote_events (candidate_id, is_socio, flag, created_at) values
  ((select id from public.candidates where slug = 'marcelo-teixeira'), true,  'valid',      '2026-11-10 02:30:00+00'),
  ((select id from public.candidates where slug = 'marcelo-teixeira'), true,  'valid',      '2026-11-10 03:30:00+00'),
  ((select id from public.candidates where slug = 'marcelo-teixeira'), false, 'valid',      '2026-11-10 15:00:00+00'),
  ((select id from public.candidates where slug = 'mauricio-maruca'),  false, 'valid',      '2026-11-11 15:00:00+00'),
  (null,                                                               true,  'valid',      '2026-11-11 12:00:00+00'),
  ((select id from public.candidates where slug = 'marcelo-teixeira'), true,  'suspicious', '2026-11-12 10:00:00+00'),
  (null,                                                               false, 'suspicious', '2026-11-12 11:00:00+00');

-- Filtro all: suspeitos ficam de fora.
select is((select votes::int from public.get_results('all') where candidate_id = (select id from public.candidates where slug = 'marcelo-teixeira')), 3, 'all: Marcelo tem 3 votos validos (suspeito excluido)');
select is((select votes::int from public.get_results('all') where candidate_id = (select id from public.candidates where slug = 'mauricio-maruca')), 1, 'all: Maruca tem 1 voto');
select is((select votes::int from public.get_results('all') where candidate_id is null), 1, 'all: Branco/Indeciso (nulo) conta 1 voto valido');
select is((select sum(votes)::int from public.get_results('all')), 5, 'all: total de votos validos e 5');
select is((select count(*)::int from public.get_results('all')), 5, 'all: continua uma linha por candidato mais a nula');

-- Filtro socio / nao_socio.
select is((select votes::int from public.get_results('socio') where candidate_id = (select id from public.candidates where slug = 'marcelo-teixeira')), 2, 'socio: Marcelo tem 2 votos de socios');
select is((select votes::int from public.get_results('socio') where candidate_id is null), 1, 'socio: Branco/Indeciso tem 1 voto de socio');
select is((select sum(votes)::int from public.get_results('socio')), 3, 'socio: total conta so is_socio = true');
select is((select count(*)::int from public.get_results('socio')), 5, 'socio: candidatos sem voto continuam com linha zerada');
select is((select votes::int from public.get_results('nao_socio') where candidate_id = (select id from public.candidates where slug = 'marcelo-teixeira')), 1, 'nao_socio: Marcelo tem 1 voto');
select is((select votes::int from public.get_results('nao_socio') where candidate_id = (select id from public.candidates where slug = 'mauricio-maruca')), 1, 'nao_socio: Maruca tem 1 voto');
select is((select votes::int from public.get_results('nao_socio') where candidate_id is null), 0, 'nao_socio: Branco/Indeciso valido de nao socio e 0 (o suspeito nao conta)');
select is((select sum(votes)::int from public.get_results('nao_socio')), 2, 'nao_socio: total conta so is_socio = false');

-- Divisao, descartados, ultima atualizacao.
select is((select socio::int from public.get_socio_split()), 3, 'split: 3 votos validos de socios');
select is((select nao_socio::int from public.get_socio_split()), 2, 'split: 2 votos validos de nao socios');
select is(public.get_discarded_count()::int, 2, 'descartados: conta os 2 votos suspicious');
select is(public.get_last_vote_at(), '2026-11-11 15:00:00+00'::timestamptz, 'get_last_vote_at ignora votos suspeitos e devolve o ultimo valido');

-- Serie diaria por dia de Sao Paulo (02:30Z e 03:30Z do mesmo dia UTC caem em dias SP diferentes).
select is(
  (select array_agg(day::text || '=' || votes order by day) from public.get_daily_series('all')),
  array['2026-11-09=1', '2026-11-10=2', '2026-11-11=2'],
  'serie diaria all: agrupa por dia de Sao Paulo, em ordem crescente, sem suspeitos');
select is(
  (select array_agg(day::text || '=' || votes order by day) from public.get_daily_series('socio')),
  array['2026-11-09=1', '2026-11-10=1', '2026-11-11=1'],
  'serie diaria socio: so votos de socios');
select is(
  (select array_agg(day::text || '=' || votes order by day) from public.get_daily_series('nao_socio')),
  array['2026-11-10=1', '2026-11-11=1'],
  'serie diaria nao_socio: so votos de nao socios');

-- Filtro invalido.
select throws_ok($$select * from public.get_results('bogus')$$, '22023'::char(5), 'filtro invalido: bogus', 'get_results rejeita filtro desconhecido');
select throws_ok($$select * from public.get_daily_series('bogus')$$, '22023'::char(5), 'filtro invalido: bogus', 'get_daily_series rejeita filtro desconhecido');
select throws_ok($$select * from public.get_results(null)$$, '22023'::char(5), 'filtro invalido: <NULL>', 'get_results rejeita filtro nulo');

-- Endurecimento das funcoes.
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('get_results', 'get_socio_split', 'get_daily_series', 'get_discarded_count', 'get_last_vote_at')
     and p.prosecdef and 'search_path=""' = any (p.proconfig)),
  5, 'as 5 funcoes sao security definer com search_path vazio');

-- anon executa as funcoes mas nao le vote_events.
set local role anon;
select lives_ok($$select * from public.get_results('all')$$, 'anon executa get_results');
select lives_ok($$select * from public.get_socio_split()$$, 'anon executa get_socio_split');
select lives_ok($$select * from public.get_daily_series('all')$$, 'anon executa get_daily_series');
select lives_ok($$select public.get_discarded_count()$$, 'anon executa get_discarded_count');
select lives_ok($$select public.get_last_vote_at()$$, 'anon executa get_last_vote_at');
select is((select sum(votes)::int from public.get_results('all')), 5, 'anon recebe os agregados corretos');
select throws_ok($$select count(*) from public.vote_events$$, '42501'::char(5), 'permission denied for table vote_events', 'anon continua sem ler vote_events');
reset role;

select * from finish();
rollback;
