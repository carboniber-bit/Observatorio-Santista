begin;
select plan(13);

insert into public.proposals (id, candidate_id, theme_id, description, source_kind)
select '00000000-0000-0000-0000-0000000000e1'::uuid, c.id, t.id, 'proposta de teste', 'reportagem'
from public.candidates c, public.themes t
where c.slug = 'marcelo-teixeira' and t.slug = 'futebol';

do $$ begin perform set_config('app.change_reason', 'teste', true); end $$;

-- (a) Sem nenhuma fonte: mensagem original da 0002 continua valendo.
select throws_ok(
  $$update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'P0001', 'proposta nao pode ser publicada sem ao menos uma fonte com trecho (excerpt) preenchido',
  'sem fonte: mensagem original');

-- Trecho em branco: mensagem original.
insert into public.sources (id, proposal_id, url, excerpt) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'https://exemplo.com/a', '   ');
select throws_ok(
  $$update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'P0001', 'proposta nao pode ser publicada sem ao menos uma fonte com trecho (excerpt) preenchido',
  'trecho em branco: mensagem original');

-- Trecho marcado como citacao a conferir: recusado, em minusculas e em maiusculas.
update public.sources set excerpt = 'a gestao propoe revisar o estatuto (citação a conferir no original)'
  where id = '00000000-0000-0000-0000-0000000000f1';
select throws_ok(
  $$update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'P0001', 'proposta nao pode ser publicada com trecho ainda marcado como citacao a conferir no original',
  'publicar com trecho marcado e recusado');
select throws_ok(
  $$update public.proposals set status = 'corrigida' where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'P0001', 'proposta nao pode ser publicada com trecho ainda marcado como citacao a conferir no original',
  'corrigir com trecho marcado e recusado');
update public.sources set excerpt = 'texto (CITAÇÃO A CONFERIR NO ORIGINAL)'
  where id = '00000000-0000-0000-0000-0000000000f1';
select throws_ok(
  $$update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'P0001', 'proposta nao pode ser publicada com trecho ainda marcado como citacao a conferir no original',
  'a marca e reconhecida sem diferenciar maiusculas');
select is(
  (select status from public.proposals where id = '00000000-0000-0000-0000-0000000000e1'),
  'em_revisao', 'a proposta continua em_revisao');

-- Uma fonte marcada e outra conferida: publica.
insert into public.sources (id, proposal_id, url, excerpt) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e1', 'https://exemplo.com/b', 'trecho conferido no original');
select lives_ok(
  $$update public.proposals set status = 'publicada' where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'com ao menos uma fonte conferida a publicacao passa');
select is(
  (select status from public.proposals where id = '00000000-0000-0000-0000-0000000000e1'),
  'publicada', 'a proposta ficou publicada');

-- (b) cast_vote e o instante de encerramento.
select is(public.voting_closes_at(), timestamptz '2026-12-12 00:00:00-03',
  'encerramento em 12/12/2026 00:00 de Brasilia');

-- Caminho normal (independe da data em que o teste roda): encerramento no futuro distante.
create or replace function public.voting_closes_at() returns timestamptz
language sql immutable as $$ select timestamptz 'infinity' $$;
select is(public.cast_vote('tok-007a', null, true, 'hash-007', 'valid'), true,
  'antes do encerramento o voto e gravado');

-- Depois do encerramento: erro VT410 e nada gravado.
create or replace function public.voting_closes_at() returns timestamptz
language sql immutable as $$ select timestamptz '2000-01-01 00:00:00+00' $$;
select throws_ok(
  $$select public.cast_vote('tok-007b', null, true, 'hash-007', 'valid')$$,
  'VT410', 'votacao encerrada',
  'depois do encerramento cast_vote levanta VT410');
select is((select count(*)::int from public.vote_events), 1, 'o voto recusado nao foi gravado');
select is((select count(*)::int from public.voter_tokens where token_hash = 'tok-007b'), 0,
  'o token do voto recusado nao foi gravado');

select * from finish();
rollback;
