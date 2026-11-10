begin;
select plan(31);

-- Dados de teste (papel postgres, ignora RLS)
insert into public.admin_allowlist (email) values ('admin@teste.local');

insert into public.proposals (id, candidate_id, theme_id, description, source_kind)
select v.id, c.id, t.id, 'proposta de teste', 'reportagem'
from public.candidates c, public.themes t,
  (values
    ('00000000-0000-0000-0000-0000000000c1'::uuid),
    ('00000000-0000-0000-0000-0000000000c2'::uuid),
    ('00000000-0000-0000-0000-0000000000c3'::uuid),
    ('00000000-0000-0000-0000-0000000000c4'::uuid)
  ) as v(id)
where c.slug = 'marcelo-teixeira' and t.slug = 'futebol';

insert into public.sources (id, proposal_id, url, excerpt) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'https://exemplo.com/1', 'trecho real'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'https://exemplo.com/2', '   '),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c4', 'https://exemplo.com/4', 'outro trecho');

insert into public.news (id, slug, title, body, category, badge) values
  ('00000000-0000-0000-0000-0000000000e1', 'noticia-rascunho', 'Rascunho', 'texto', 'eleicao', 'plataforma');
insert into public.analyses (id, slug, title, facts, candidate_statements, editorial_interpretation) values
  ('00000000-0000-0000-0000-0000000000f1', 'analise-rascunho', 'Rascunho', 'f', 'c', 'i');

-- c4 publicada e c3 (rascunho) editada, para o teste de visibilidade do change_log
do $$ begin perform set_config('app.change_reason', 'preparo', true); end $$;
update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000c4';
update public.proposals set description = 'editada em rascunho' where id = '00000000-0000-0000-0000-0000000000c3';
do $$ begin perform set_config('app.change_reason', '', true); end $$;

-- (a) update sem motivo falha
select throws_ok(
  $$update public.proposals set description = 'x' where id = '00000000-0000-0000-0000-0000000000c1'$$,
  'P0001'::char(5), 'alteracao exige motivo: use as funcoes admin_update_*',
  '(a) UPDATE em proposals sem app.change_reason falha');
select throws_ok(
  $$update public.news set title = 'x'$$,
  'P0001'::char(5), 'alteracao exige motivo: use as funcoes admin_update_*',
  '(a) UPDATE em news sem app.change_reason falha');

-- R19
select throws_ok(
  $$insert into public.proposals (candidate_id, theme_id, description, source_kind, status)
    select c.id, t.id, 'x', 'reportagem', 'publicada' from public.candidates c, public.themes t limit 1$$,
  'P0001'::char(5), 'proposta nova deve entrar com status em_revisao',
  'R19: insert como publicada falha');

-- (c) regra de publicacao (motivo presente, fonte ausente ou em branco)
do $$ begin perform set_config('app.change_reason', 'teste', true); end $$;
select throws_ok(
  $$update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000c3'$$,
  'P0001'::char(5), 'proposta nao pode ser publicada sem ao menos uma fonte com trecho (excerpt) preenchido',
  '(c) publicar sem fonte falha');
select throws_ok(
  $$update public.proposals set status = 'corrigida' where id = '00000000-0000-0000-0000-0000000000c2'$$,
  'P0001'::char(5), 'proposta nao pode ser publicada sem ao menos uma fonte com trecho (excerpt) preenchido',
  '(c) corrigir com fonte de trecho em branco falha');
select lives_ok(
  $$update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000c1'$$,
  '(c) publicar com fonte de trecho real funciona');
do $$ begin perform set_config('app.change_reason', '', true); end $$;

-- Admin (aal2 + e-mail na allowlist)
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","aal":"aal2","email":"admin@teste.local"}';

-- (b) RPC grava change_log completo
select lives_ok(
  $$select public.admin_update_proposal('00000000-0000-0000-0000-0000000000c1',
      '{"description":"nova descricao"}', 'corrigir descricao', '00000000-0000-0000-0000-0000000000d1')$$,
  '(b) admin_update_proposal funciona');
select is((select count(*)::int from public.admin_change_log()
    where row_id = '00000000-0000-0000-0000-0000000000c1'
      and reason = 'corrigir descricao'
      and old_value ->> 'description' = 'proposta de teste'
      and new_value ->> 'description' = 'nova descricao'
      and author = 'admin@teste.local'
      and source_id = '00000000-0000-0000-0000-0000000000d1'), 1,
  '(b) change_log tem 1 linha com old_value, new_value, reason, source_id e author');

-- (d) retirada mantem a linha
select lives_ok(
  $$select public.admin_update_proposal('00000000-0000-0000-0000-0000000000c1',
      '{"status":"retirada"}', 'retirada por erro')$$,
  '(d) admin retira proposta');
select is((select count(*)::int from public.proposals
    where id = '00000000-0000-0000-0000-0000000000c1' and status = 'retirada'), 1,
  '(d) proposta retirada continua existindo com status retirada');
select is((select count(*)::int from public.admin_change_log()
    where row_id = '00000000-0000-0000-0000-0000000000c1' and reason = 'retirada por erro'), 1,
  '(d) a retirada foi registrada no change_log');

-- RPC e a regra de publicacao
select throws_ok(
  $$select public.admin_update_proposal('00000000-0000-0000-0000-0000000000c3',
      '{"status":"publicada"}', 'publicar')$$,
  'P0001'::char(5), 'proposta nao pode ser publicada sem ao menos uma fonte com trecho (excerpt) preenchido',
  'RPC nao publica proposta sem fonte com trecho');

-- GUC nao fica velha apos a RPC
select throws_ok(
  $$update public.proposals set description = 'x' where id = '00000000-0000-0000-0000-0000000000c3'$$,
  'P0001'::char(5), 'alteracao exige motivo: use as funcoes admin_update_*',
  'UPDATE direto apos a RPC, na mesma transacao, exige motivo de novo');

-- Validacao do patch e do motivo
select throws_ok(
  $$select public.admin_update_proposal('00000000-0000-0000-0000-0000000000c3',
      '{"id":"00000000-0000-0000-0000-000000000001"}', 'x')$$,
  'P0001'::char(5), 'campos nao editaveis: id',
  'RPC rejeita chave desconhecida (id)');
select throws_ok(
  $$select public.admin_update_news('00000000-0000-0000-0000-0000000000e1',
      '{"slug":"outro"}', 'x')$$,
  'P0001'::char(5), 'campos nao editaveis: slug',
  'RPC rejeita edicao de slug');
select throws_ok(
  $$select public.admin_update_proposal('00000000-0000-0000-0000-0000000000c3',
      '{"description":"x"}', '   ')$$,
  'P0001'::char(5), 'motivo da alteracao e obrigatorio',
  'RPC rejeita motivo em branco');

-- news, analyses e candidates tambem gravam change_log
select lives_ok(
  $$select public.admin_update_news('00000000-0000-0000-0000-0000000000e1',
      '{"title":"Novo titulo"}', 'ajuste de titulo')$$,
  'admin_update_news funciona');
select is((select count(*)::int from public.admin_change_log()
    where table_name = 'news' and row_id = '00000000-0000-0000-0000-0000000000e1'
      and reason = 'ajuste de titulo' and new_value ->> 'title' = 'Novo titulo'), 1,
  'admin_update_news grava 1 linha em change_log');
select lives_ok(
  $$select public.admin_update_analysis('00000000-0000-0000-0000-0000000000f1',
      '{"facts":"fatos novos"}', 'ajuste de fatos')$$,
  'admin_update_analysis funciona');
select is((select count(*)::int from public.admin_change_log()
    where table_name = 'analyses' and row_id = '00000000-0000-0000-0000-0000000000f1'
      and reason = 'ajuste de fatos' and new_value ->> 'facts' = 'fatos novos'), 1,
  'admin_update_analysis grava 1 linha em change_log');
select lives_ok(
  $$select public.admin_update_candidate((select id from public.candidates where slug = 'marcelo-teixeira'),
      '{"ticket_name":"Chapa Teste"}', 'ajuste de chapa')$$,
  'admin_update_candidate funciona');
select is((select count(*)::int from public.admin_change_log()
    where table_name = 'candidates' and reason = 'ajuste de chapa'
      and new_value ->> 'ticket_name' = 'Chapa Teste'), 1,
  'admin_update_candidate grava 1 linha em change_log');

-- Nao admin: aal1 e e-mail fora da allowlist
set local request.jwt.claims = '{"role":"authenticated","aal":"aal1","email":"admin@teste.local"}';
select throws_ok(
  $$select public.admin_update_proposal('00000000-0000-0000-0000-0000000000c3',
      '{"description":"x"}', 'x')$$,
  '42501'::char(5), 'acesso negado: apenas administradores',
  'RPC rejeita aal1 mesmo com e-mail na allowlist');
select throws_ok(
  $$select * from public.admin_change_log()$$,
  '42501'::char(5), 'acesso negado: apenas administradores',
  'admin_change_log rejeita aal1');
set local request.jwt.claims = '{"role":"authenticated","aal":"aal2","email":"intruso@teste.local"}';
select throws_ok(
  $$select public.admin_update_news('00000000-0000-0000-0000-0000000000e1',
      '{"title":"x"}', 'x')$$,
  '42501'::char(5), 'acesso negado: apenas administradores',
  'RPC rejeita aal2 com e-mail fora da allowlist');
select throws_ok(
  $$select * from public.admin_change_log()$$,
  '42501'::char(5), 'acesso negado: apenas administradores',
  'admin_change_log rejeita e-mail fora da allowlist');

-- (e) anon le change_log
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select lives_ok(
  $$select id, table_name, row_id, old_value, new_value, changed_at, reason, source_id from public.change_log$$,
  '(e) anon le change_log (colunas publicas)');
select is((select count(*)::int from public.change_log
    where row_id = '00000000-0000-0000-0000-0000000000c3'), 0,
  'anon nao ve change_log de proposta em revisao');
select is((select count(*)::int from public.change_log
    where row_id = '00000000-0000-0000-0000-0000000000c4'), 1,
  'anon ve change_log de proposta publicada');
select is((select count(*)::int from public.change_log
    where row_id = '00000000-0000-0000-0000-0000000000c1'), 3,
  'anon ve change_log de proposta retirada (publicacao, edicao e retirada)');
select throws_ok(
  $$select public.admin_update_proposal('00000000-0000-0000-0000-0000000000c3',
      '{"description":"x"}', 'x')$$,
  '42501'::char(5), 'permission denied for function admin_update_proposal',
  'anon nao executa a RPC');

select * from finish();
rollback;
