begin;
select plan(15);

insert into public.admin_allowlist (email) values ('admin@teste.local');

insert into public.proposals (id, candidate_id, theme_id, description, source_kind)
select v.id, c.id, t.id, 'proposta de teste', 'reportagem'
from public.candidates c, public.themes t,
  (values
    ('00000000-0000-0000-0000-0000000000c1'::uuid),
    ('00000000-0000-0000-0000-0000000000c2'::uuid)
  ) as v(id)
where c.slug = 'marcelo-teixeira' and t.slug = 'futebol';

-- c1: duas fontes com trecho; c2: uma fonte com trecho (e rascunho depois)
insert into public.sources (id, proposal_id, url, excerpt) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'https://exemplo.com/1', 'trecho um'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'https://exemplo.com/2', 'trecho dois'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c2', 'https://exemplo.com/3', 'trecho tres');

do $$ begin perform set_config('app.change_reason', 'preparo', true); end $$;
update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000c1';
do $$ begin perform set_config('app.change_reason', '', true); end $$;

-- Proposta publicada: UPDATE direto de excerpt/url sem motivo e rejeitado.
select throws_ok(
  $$update public.sources set excerpt = 'novo' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'P0001', 'alteracao de fonte publicada exige motivo: use admin_update_source',
  'UPDATE de excerpt sem motivo em proposta publicada e rejeitado');
select throws_ok(
  $$update public.sources set url = 'https://outro.com' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'P0001', 'alteracao de fonte publicada exige motivo: use admin_update_source',
  'UPDATE de url sem motivo em proposta publicada e rejeitado');
-- Mesmo com motivo, deixar o trecho em branco e rejeitado.
do $$ begin perform set_config('app.change_reason', 'teste', true); end $$;
select throws_ok(
  $$update public.sources set excerpt = '   ' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'P0001', 'fonte de proposta publicada nao pode ficar sem trecho (excerpt)',
  'excerpt em branco e rejeitado mesmo com motivo');
select throws_ok(
  $$update public.sources set proposal_id = '00000000-0000-0000-0000-0000000000c2' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'P0001', 'fonte de proposta publicada nao pode mudar de proposta',
  'mover fonte para outra proposta e rejeitado');
select lives_ok(
  $$update public.sources set excerpt = 'trecho um revisado' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'UPDATE com motivo e trecho preenchido passa');
do $$ begin perform set_config('app.change_reason', '', true); end $$;
select is((select count(*)::int from public.change_log
  where table_name = 'sources' and row_id = '00000000-0000-0000-0000-0000000000d1'), 1,
  'edicao de fonte gerou uma linha em change_log');
select is((select reason from public.change_log where table_name = 'sources'), 'teste',
  'change_log guarda o motivo da edicao da fonte');

-- Qualquer campo da fonte publicada exige motivo (outlet, kind, datas tambem).
select throws_ok(
  $$update public.sources set outlet = 'Jornal' where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'P0001', 'alteracao de fonte publicada exige motivo: use admin_update_source',
  'UPDATE de outlet sem motivo em proposta publicada e rejeitado');
select throws_ok(
  $$update public.sources set kind = 'x' where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'P0001', 'alteracao de fonte publicada exige motivo: use admin_update_source',
  'UPDATE de kind sem motivo e rejeitado');
select throws_ok(
  $$update public.sources set consulted_on = current_date where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'P0001', 'alteracao de fonte publicada exige motivo: use admin_update_source',
  'UPDATE de data sem motivo e rejeitado');

do $$ begin perform set_config('app.change_reason', 'ajuste de veiculo', true); end $$;
select lives_ok(
  $$update public.sources set outlet = 'Jornal' where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'UPDATE de outlet com motivo passa');
do $$ begin perform set_config('app.change_reason', '', true); end $$;

-- DELETE: remover a unica fonte com trecho e rejeitado; com outra restante, passa
-- pela guarda (e cai no bloqueio geral sources_no_delete).
select throws_ok(
  $$delete from public.sources where id = '00000000-0000-0000-0000-0000000000d2'$$,
  'P0001', 'DELETE proibido em sources',
  'DELETE com outra fonte restante cai no bloqueio geral');
do $$ begin perform set_config('app.change_reason', 'preparo', true); end $$;
update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000c2';
do $$ begin perform set_config('app.change_reason', '', true); end $$;
select throws_ok(
  $$delete from public.sources where id = '00000000-0000-0000-0000-0000000000d3'$$,
  'P0001', 'proposta publicada precisa manter ao menos uma fonte com trecho',
  'DELETE da unica fonte com trecho de proposta publicada e rejeitado');

-- RPC do admin: aal2 + allowlist; motivo obrigatorio.
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","aal":"aal2","email":"admin@teste.local"}';
select lives_ok(
  $$select public.admin_update_source('00000000-0000-0000-0000-0000000000d3', '{"excerpt":"trecho tres revisado"}'::jsonb, 'correcao de transcricao')$$,
  'admin_update_source altera excerpt com motivo');
select throws_ok(
  $$select public.admin_update_source('00000000-0000-0000-0000-0000000000d3', '{"excerpt":"x"}'::jsonb, '  ')$$,
  'P0001', 'motivo da alteracao e obrigatorio',
  'admin_update_source sem motivo e rejeitado');
reset role;

select * from finish();
rollback;
