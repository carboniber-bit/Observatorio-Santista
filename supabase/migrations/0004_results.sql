-- Observatório Santista 2026: funções públicas de resultado.
--
-- Só agregados: anon continua sem nenhum privilégio em vote_events. Todas as
-- funções são SECURITY DEFINER com search_path vazio e nomes qualificados.
-- Apenas votos com flag = 'valid' entram nos totais; 'suspicious' só aparece
-- em get_discarded_count.

-- Uma linha por candidato (0 quando não há votos) e uma linha com
-- candidate_id nulo para Branco/Indeciso.
create function public.get_results(p_filter text)
returns table (candidate_id uuid, votes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_filter is null or p_filter not in ('all', 'socio', 'nao_socio') then
    raise exception 'filtro invalido: %', p_filter using errcode = '22023';
  end if;

  return query
  select c.id, count(v.id)::bigint
  from public.candidates c
  left join public.vote_events v
    on v.candidate_id = c.id
   and v.flag = 'valid'
   and (p_filter = 'all'
        or (p_filter = 'socio' and v.is_socio)
        or (p_filter = 'nao_socio' and not v.is_socio))
  group by c.id
  union all
  select null::uuid, count(*)::bigint
  from public.vote_events v
  where v.candidate_id is null
    and v.flag = 'valid'
    and (p_filter = 'all'
         or (p_filter = 'socio' and v.is_socio)
         or (p_filter = 'nao_socio' and not v.is_socio));
end;
$$;

create function public.get_socio_split()
returns table (socio bigint, nao_socio bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where v.is_socio)::bigint,
    count(*) filter (where not v.is_socio)::bigint
  from public.vote_events v
  where v.flag = 'valid';
$$;

create function public.get_daily_series(p_filter text)
returns table (day date, votes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_filter is null or p_filter not in ('all', 'socio', 'nao_socio') then
    raise exception 'filtro invalido: %', p_filter using errcode = '22023';
  end if;

  return query
  select (v.created_at at time zone 'America/Sao_Paulo')::date as d, count(*)::bigint
  from public.vote_events v
  where v.flag = 'valid'
    and (p_filter = 'all'
         or (p_filter = 'socio' and v.is_socio)
         or (p_filter = 'nao_socio' and not v.is_socio))
  group by d
  order by d asc;
end;
$$;

create function public.get_discarded_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint from public.vote_events v where v.flag = 'suspicious';
$$;

create function public.get_last_vote_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(v.created_at) from public.vote_events v where v.flag = 'valid';
$$;

revoke all on function public.get_results(text) from public;
revoke all on function public.get_socio_split() from public;
revoke all on function public.get_daily_series(text) from public;
revoke all on function public.get_discarded_count() from public;
revoke all on function public.get_last_vote_at() from public;
grant execute on function public.get_results(text) to anon, authenticated, service_role;
grant execute on function public.get_socio_split() to anon, authenticated, service_role;
grant execute on function public.get_daily_series(text) to anon, authenticated, service_role;
grant execute on function public.get_discarded_count() to anon, authenticated, service_role;
grant execute on function public.get_last_vote_at() to anon, authenticated, service_role;
