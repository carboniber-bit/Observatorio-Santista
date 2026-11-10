begin;
select plan(48);

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

insert into public.analyses (slug, title, facts, candidate_statements, editorial_interpretation, status) values
  ('analise-publicada', 'Publicada', 'f', 'c', 'i', 'publicada'),
  ('analise-rascunho', 'Rascunho', 'f', 'c', 'i', 'rascunho');

insert into public.change_log (table_name, row_id, new_value, author)
select 'proposals', v.id, '{}'::jsonb, 'admin@teste.local'
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid),
  ('00000000-0000-0000-0000-0000000000a3'::uuid),
  ('00000000-0000-0000-0000-0000000000a4'::uuid)
) as v(id);
insert into public.change_log (table_name, row_id, new_value, author)
select 'candidates', id, '{}'::jsonb, 'admin@teste.local' from public.candidates limit 1;
insert into public.change_log (table_name, row_id, new_value, author)
select 'news', id, '{}'::jsonb, 'admin@teste.local' from public.news where status = 'rascunho';

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

select is((select count(*)::int from public.analyses), 1,
  'anon nao ve analise em rascunho');
select throws_ok(
  $$select * from public.correction_requests$$,
  '42501'::char(5), 'permission denied for table correction_requests',
  'anon nao le correction_requests');
select throws_ok(
  $$select author from public.change_log$$,
  '42501'::char(5), 'permission denied for table change_log',
  'anon nao le a coluna author de change_log');
select is((select count(*)::int from public.change_log), 3,
  'anon ve change_log de proposta publicada, retirada e de candidato, nao de rascunhos');
select is((select count(*)::int from public.change_log where row_id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'anon ve change_log de proposta publicada');
select is((select count(*)::int from public.change_log where row_id = '00000000-0000-0000-0000-0000000000a3'), 0,
  'anon nao ve change_log de proposta em_revisao');
select throws_ok(
  $$select * from public.vote_hashes$$,
  '42501'::char(5), 'permission denied for table vote_hashes',
  'anon nao le vote_hashes');
select throws_ok(
  $$select * from public.voter_tokens$$,
  '42501'::char(5), 'permission denied for table voter_tokens',
  'anon nao le voter_tokens');

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
select throws_ok(
  $$insert into public.news (slug, title, body, category, badge) values ('x', 'x', 'x', 'eleicao', 'plataforma')$$,
  '42501'::char(5), 'new row violates row-level security policy for table "news"',
  'authenticated aal1 com e-mail na allowlist nao escreve');
select throws_ok(
  $$select * from public.vote_hashes$$,
  '42501'::char(5), 'permission denied for table vote_hashes',
  'authenticated nao le vote_hashes');
select throws_ok(
  $$select * from public.voter_tokens$$,
  '42501'::char(5), 'permission denied for table voter_tokens',
  'authenticated nao le voter_tokens');

set local request.jwt.claims = '{"role":"authenticated","aal":"aal2","email":"intruso@teste.local"}';
select throws_ok(
  $$insert into public.news (slug, title, body, category, badge) values ('x', 'x', 'x', 'eleicao', 'plataforma')$$,
  '42501'::char(5), 'new row violates row-level security policy for table "news"',
  'authenticated aal2 com e-mail fora da allowlist nao escreve');

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

-- service_role: sem UPDATE/DELETE/TRUNCATE em vote_events nem TRUNCATE em proposals
set local role service_role;
select throws_ok(
  $$update public.vote_events set is_socio = false$$,
  '42501'::char(5), 'permission denied for table vote_events',
  'service_role nao faz UPDATE em vote_events');
select throws_ok(
  $$delete from public.vote_events$$,
  '42501'::char(5), 'permission denied for table vote_events',
  'service_role nao faz DELETE em vote_events');
select throws_ok(
  $$truncate public.vote_events cascade$$,
  '42501'::char(5), 'permission denied for table vote_events',
  'service_role nao faz TRUNCATE em vote_events');
select throws_ok(
  $$truncate public.proposals cascade$$,
  '42501'::char(5), 'permission denied for table proposals',
  'service_role nao faz TRUNCATE em proposals');

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

select throws_ok(
  $$truncate public.candidates cascade$$,
  'P0001'::char(5), 'TRUNCATE proibido em candidates',
  'gatilho bloqueia TRUNCATE em candidates');
select throws_ok(
  $$truncate public.proposals cascade$$,
  'P0001'::char(5), 'TRUNCATE proibido em proposals',
  'gatilho bloqueia TRUNCATE em proposals');
select throws_ok(
  $$truncate public.sources$$,
  'P0001'::char(5), 'TRUNCATE proibido em sources',
  'gatilho bloqueia TRUNCATE em sources');
select throws_ok(
  $$truncate public.news$$,
  'P0001'::char(5), 'TRUNCATE proibido em news',
  'gatilho bloqueia TRUNCATE em news');
select throws_ok(
  $$truncate public.analyses$$,
  'P0001'::char(5), 'TRUNCATE proibido em analyses',
  'gatilho bloqueia TRUNCATE em analyses');
select throws_ok(
  $$truncate public.change_log$$,
  'P0001'::char(5), 'TRUNCATE proibido em change_log',
  'gatilho bloqueia TRUNCATE em change_log');

select * from finish();
rollback;
