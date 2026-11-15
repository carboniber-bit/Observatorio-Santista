-- Observatório Santista 2026: barreiras finais de publicação e de encerramento.
--
-- (a) Regra de publicação: uma proposta so vira publicada/corrigida se tiver ao menos
--     uma fonte cujo trecho (excerpt) nao seja vazio E nao contenha a marca
--     "(citação a conferir no original)" (sem diferenciar maiusculas). Essa marca e
--     colocada pelo importador (content/seed) em citacoes ainda nao conferidas.
--     A mensagem original (0002) e mantida quando nao ha nenhum trecho preenchido;
--     uma mensagem propria cobre o caso em que so restam trechos marcados.
-- (b) Defesa em profundidade: cast_vote recusa votos a partir de 12/12/2026 00:00
--     (America/Sao_Paulo, -03:00), mesmo que a rota seja chamada por engano. A rota
--     ja responde 410 antes de chegar aqui; o erro VT410 cobre a corrida na virada
--     e a rota o traduz em 410 (nao em 500).

create or replace function public.proposals_publish_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  c_mark constant text := '(citação a conferir no original)';
begin
  if new.status in ('publicada', 'corrigida') then
    if not exists (
      select 1 from public.sources s
      where s.proposal_id = new.id
        and length(btrim(s.excerpt)) > 0
    ) then
      raise exception 'proposta nao pode ser publicada sem ao menos uma fonte com trecho (excerpt) preenchido'
        using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.sources s
      where s.proposal_id = new.id
        and length(btrim(s.excerpt)) > 0
        and strpos(lower(s.excerpt), lower(c_mark)) = 0
    ) then
      raise exception 'proposta nao pode ser publicada com trecho ainda marcado como citacao a conferir no original'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- Instante de encerramento da votacao, em um unico lugar (a funcao existe tambem
-- para os testes poderem substitui-la dentro de uma transacao revertida).
create function public.voting_closes_at()
returns timestamptz
language sql
immutable
set search_path = ''
as $$ select timestamptz '2026-12-12 00:00:00-03' $$;

revoke all on function public.voting_closes_at() from public, anon, authenticated;

create or replace function public.cast_vote(
  p_token_hash text,
  p_candidate_id uuid,
  p_is_socio boolean,
  p_voter_hash text,
  p_flag text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vote_id uuid;
begin
  if now() >= public.voting_closes_at() then
    raise exception 'votacao encerrada' using errcode = 'VT410';
  end if;

  if p_flag is null or p_flag not in ('valid', 'suspicious') then
    raise exception 'flag invalida: %', p_flag using errcode = '22023';
  end if;

  insert into public.voter_tokens (token_hash, created_at)
  values (p_token_hash, date_trunc('day', now()))
  on conflict do nothing;

  if not found then
    return false;
  end if;

  insert into public.vote_events (candidate_id, is_socio, flag)
  values (p_candidate_id, p_is_socio, p_flag)
  returning id into v_vote_id;

  insert into public.vote_hashes (vote_id, voter_hash)
  values (v_vote_id, p_voter_hash);

  return true;
end;
$$;
