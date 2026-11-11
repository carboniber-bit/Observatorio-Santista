-- Observatório Santista 2026: registro de voto.
--
-- cast_vote grava, numa única transação, o token usado (voter_tokens), o voto
-- anônimo (vote_events) e o hash diário do eleitor (vote_hashes). Não há coluna
-- nem chave que ligue o token ao voto: voter_tokens guarda só sha256 do token e
-- vote_events não referencia o token nem o hash.
--
-- Concorrência: duas chamadas simultâneas com o mesmo token_hash disputam o
-- índice único de voter_tokens; a segunda espera a primeira confirmar e então
-- cai no ON CONFLICT DO NOTHING (FOUND = false), devolvendo false.
--
-- A rota POST /api/vote chama esta função com a chave de serviço (service_role)
-- e conta os votos recentes de um hash lendo vote_hashes também como
-- service_role: anon e authenticated não têm nenhum privilégio nessas tabelas.

create function public.cast_vote(
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
  if p_flag is null or p_flag not in ('valid', 'suspicious') then
    raise exception 'flag invalida: %', p_flag using errcode = '22023';
  end if;

  insert into public.voter_tokens (token_hash)
  values (p_token_hash)
  on conflict do nothing;

  if not found then
    return false;
  end if;

  -- candidate_id inexistente levanta violação de chave estrangeira (23503);
  -- a rota traduz isso em 400 e a transação inteira (inclusive o token) desfaz.
  insert into public.vote_events (candidate_id, is_socio, flag)
  values (p_candidate_id, p_is_socio, p_flag)
  returning id into v_vote_id;

  insert into public.vote_hashes (vote_id, voter_hash)
  values (v_vote_id, p_voter_hash);

  return true;
end;
$$;

revoke all on function public.cast_vote(text, uuid, boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.cast_vote(text, uuid, boolean, text, text)
  to service_role;
