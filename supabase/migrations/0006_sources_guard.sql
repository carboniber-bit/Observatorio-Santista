-- Observatório Santista 2026: guarda da tabela sources (follow-up R7 / T3 diferido).
--
-- Problema: o admin pode fazer UPDATE direto em sources (RLS permite), o que deixaria
-- uma proposta publicada/corrigida sem trecho comprobatorio depois da publicacao.
-- Regras para fontes de proposta publicada ou corrigida:
--   * UPDATE nunca pode deixar o trecho (excerpt) em branco;
--   * UPDATE nao pode mover a fonte para outra proposta;
--   * qualquer UPDATE que mude a fonte (url, excerpt, outlet, kind, datas) exige motivo (app.change_reason), definido
--     pela RPC admin_update_source;
--   * DELETE que deixaria a proposta sem fonte com trecho e rejeitado (DELETE ja e
--     bloqueado por sources_no_delete e REVOKE; esta e uma segunda barreira).
-- Toda edicao de fonte e registrada em change_log (somente o admin le: a funcao
-- change_log_is_public devolve false para a tabela sources).

create function public.sources_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_has_other boolean;
begin
  select p.status into v_status
  from public.proposals p
  where p.id = old.proposal_id;

  if v_status is null or v_status not in ('publicada', 'corrigida') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    select exists (
      select 1 from public.sources s
      where s.proposal_id = old.proposal_id
        and s.id <> old.id
        and length(btrim(s.excerpt)) > 0
    ) into v_has_other;
    if not v_has_other then
      raise exception 'proposta publicada precisa manter ao menos uma fonte com trecho'
        using errcode = 'P0001';
    end if;
    return old;
  end if;

  if new.proposal_id is distinct from old.proposal_id then
    raise exception 'fonte de proposta publicada nao pode mudar de proposta'
      using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(new.excerpt, ''))) = 0
     and length(btrim(coalesce(old.excerpt, ''))) > 0 then
    raise exception 'fonte de proposta publicada nao pode ficar sem trecho (excerpt)'
      using errcode = 'P0001';
  end if;
  if (old.* is distinct from new.*)
     and btrim(coalesce(current_setting('app.change_reason', true), ''), E' \t\r\n') = '' then
    raise exception 'alteracao de fonte publicada exige motivo: use admin_update_source'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Nome com prefixo 1_ para disparar antes de sources_no_delete (ordem alfabetica).
create trigger sources_1_guard before update or delete on public.sources
  for each row execute function public.sources_guard();

create trigger sources_log_change after update on public.sources
  for each row when (old.* is distinct from new.*)
  execute function public.log_change();

revoke all on function public.sources_guard() from public, anon, authenticated;

-- RPC de edicao de fonte (mesmo molde das demais admin_update_*).
create function public.admin_update_source(
  p_id uuid, p_patch jsonb, p_reason text
)
returns public.sources
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.sources;
  v_rec public.sources;
  v_new public.sources;
begin
  if not public.is_admin() then
    raise exception 'acesso negado: apenas administradores' using errcode = '42501';
  end if;
  perform public.editorial_begin(p_patch, p_reason, null,
    array['url', 'outlet', 'published_on', 'consulted_on', 'kind', 'excerpt']);

  select * into v_old from public.sources where id = p_id for update;
  if not found then
    raise exception 'sources % nao encontrado', p_id using errcode = 'P0002';
  end if;

  v_rec := jsonb_populate_record(v_old, p_patch);
  update public.sources set
    url = v_rec.url,
    outlet = v_rec.outlet,
    published_on = v_rec.published_on,
    consulted_on = v_rec.consulted_on,
    kind = v_rec.kind,
    excerpt = v_rec.excerpt
  where id = p_id
  returning * into v_new;

  perform public.editorial_end();
  return v_new;
end;
$$;

revoke all on function public.admin_update_source(uuid, jsonb, text) from public, anon, authenticated, service_role;
grant execute on function public.admin_update_source(uuid, jsonb, text) to authenticated;
