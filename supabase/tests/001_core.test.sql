begin;
select plan(26);

-- Dados de teste (papel postgres, ignora RLS)
insert into public.admin_allowlist (email) values ('admin@teste.local');

insert into public.proposals (id, candidate_id, theme_id, description, source_kind, status)
select v.id, c.id, t.id, 'proposta de teste', 'reportagem', v.status
from public.candidates c, public.themes t,
  (values
    ('00000000-0000-0000-0000-0000000000a1'::uuid, 'publicada'),
    ('00000000-0000-0000-0000-0000000000a2'::uuid, 'corrigida'),
    ('00000000-0000-0000-0000-0000000000a3'::uuid, 'em_revisao'),
    ('00000000-0000-0000-0000-0000000000a4'::uuid, 'retirada')
  ) as v(id, status)
where c.slug = 'marcelo-teixeira' and t.slug = 'futebol';

insert into public.sources (proposal_id, url) values
  ('00000000-0000-0000-0000-0000000000a1', 'https://exemplo.com/publicada'),
  ('00000000-0000-0000-0000-0000000000a3', 'https://exemplo.com/em-revisao');

insert into public.news (slug, title, body, category, badge, status) values
  ('noticia-publicada', 'Publicada', 'texto', 'eleicao', 'plataforma', 'publicada'),
  ('noticia-rascunho', 'Rascunho', 'texto', 'eleicao', 'plataforma', 'rascunho');

insert into public.vote_events (id, candidate_id, is_socio) values
  ('00000000-0000-0000-0000-0000000000b1', null, true);

-- (e) seed
select is((select count(*)::int from public.candidates), 4,
  '(e) candidates tem exatamente 4 linhas apos o seed');

-- (a) anon
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select is((select count(*)::int from public.proposals), 2,
  '(a) anon ve apenas 2 propostas (publicada e corrigida)');
select is((select count(*)::int from public.proposals where status in ('em_revisao', 'retirada')), 0,
  '(a) anon nao ve propostas em_revisao nem retirada');
select is((select count(*)::int from public.sources), 1,
  'anon so ve fontes de propostas publicadas ou corrigidas');
select is((select count(*)::int from public.news), 1,
  'anon so ve noticias publicadas');
select throws_ok(
  $$select * from public.admin_allowlist$$,
  '42501'::char(5), 'permission denied for table admin_allowlist',
  'anon nao le admin_allowlist');
select throws_ok(
  $$insert into public.correction_requests (body) values ('x')$$,
  '42501'::char(5), 'permission denied for table correction_requests',
  'anon nao insere em correction_requests');

-- (b) insercao direta de voto
select throws_ok(
  $$insert into public.vote_events (is_socio) values (true)$$,
  '42501'::char(5), 'permission denied for table vote_events',
  '(b) anon nao insere em vote_events');

set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","aal":"aal1","email":"admin@teste.local"}';
select throws_ok(
  $$insert into public.vote_events (is_socio) values (true)$$,
  '42501'::char(5), 'permission denied for table vote_events',
  '(b) authenticated nao insere em vote_events');
select is(public.is_admin(), false,
  'e-mail na allowlist mas aal1 nao e admin');

reset role;
select hasnt_column('public', 'vote_events', 'voter_hash',
  'vote_events nao tem coluna voter_hash');

-- Admin (aal2 + e-mail na allowlist)
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","aal":"aal2","email":"admin@teste.local"}';

select is(public.is_admin(), true, 'aal2 + e-mail na allowlist e admin');
select is((select count(*)::int from public.proposals), 4,
  'admin ve todas as propostas, inclusive nao publicadas');
select lives_ok(
  $$update public.candidates set ticket_name = 'Chapa Teste' where slug = 'marcelo-teixeira'$$,
  'admin atualiza candidates');
select is((select ticket_name from public.candidates where slug = 'marcelo-teixeira'), 'Chapa Teste',
  'a atualizacao do admin foi aplicada');

-- (c) mesmo admin: UPDATE e DELETE em vote_events falham
select throws_ok(
  $$update public.vote_events set is_socio = false$$,
  '42501'::char(5), 'permission denied for table vote_events',
  '(c) admin nao faz UPDATE em vote_events');
select throws_ok(
  $$delete from public.vote_events$$,
  '42501'::char(5), 'permission denied for table vote_events',
  '(c) admin nao faz DELETE em vote_events');

-- (d) mesmo admin: DELETE em proposals, news e candidates falha
select throws_ok(
  $$delete from public.proposals$$,
  '42501'::char(5), 'permission denied for table proposals',
  '(d) admin nao faz DELETE em proposals');
select throws_ok(
  $$delete from public.news$$,
  '42501'::char(5), 'permission denied for table news',
  '(d) admin nao faz DELETE em news');
select throws_ok(
  $$delete from public.candidates$$,
  '42501'::char(5), 'permission denied for table candidates',
  '(d) admin nao faz DELETE em candidates');

-- Caminho do gatilho (superusuario, sem restricao de privilegio)
reset role;
select throws_ok(
  $$update public.vote_events set is_socio = false$$,
  'P0001'::char(5), 'UPDATE proibido em vote_events',
  '(c) gatilho bloqueia UPDATE em vote_events ate para superusuario');
select throws_ok(
  $$delete from public.vote_events$$,
  'P0001'::char(5), 'DELETE proibido em vote_events',
  '(c) gatilho bloqueia DELETE em vote_events ate para superusuario');
select throws_ok(
  $$truncate public.vote_events cascade$$,
  'P0001'::char(5), 'TRUNCATE proibido em vote_events',
  'gatilho bloqueia TRUNCATE em vote_events');
select throws_ok(
  $$delete from public.proposals$$,
  'P0001'::char(5), 'DELETE proibido em proposals',
  '(d) gatilho bloqueia DELETE em proposals');
select throws_ok(
  $$delete from public.news$$,
  'P0001'::char(5), 'DELETE proibido em news',
  '(d) gatilho bloqueia DELETE em news');
select throws_ok(
  $$delete from public.candidates$$,
  'P0001'::char(5), 'DELETE proibido em candidates',
  '(d) gatilho bloqueia DELETE em candidates');

select * from finish();
rollback;
