-- Observatório Santista 2026: historico de alteracoes (change_log), regra de
-- publicacao e RPCs de edicao do admin.
--
-- Fluxo: o admin chama admin_update_*; a RPC checa is_admin(), registra motivo,
-- fonte e autor em GUCs locais da transacao (app.change_*), aplica o patch e limpa
-- as GUCs. Gatilhos BEFORE UPDATE exigem o motivo (UPDATE direto sem motivo falha)
-- e gatilhos AFTER UPDATE gravam o change_log.
-- Todas as funcoes abaixo sao security definer com search_path vazio: change_log
-- nao tem INSERT para authenticated (so a trilha escreve nela).

-- ---------------------------------------------------------------------------
-- R19: proposta nova entra sempre em revisao
-- ---------------------------------------------------------------------------

create function public.proposals_force_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from 'em_revisao' then
    raise exception 'proposta nova deve entrar com status em_revisao'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger proposals_1_force_review before insert on public.proposals
  for each row execute function public.proposals_force_review();

-- ---------------------------------------------------------------------------
-- BEFORE UPDATE: exige motivo e mantem updated_at
-- ---------------------------------------------------------------------------

create function public.require_change_reason()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if btrim(coalesce(current_setting('app.change_reason', true), ''), E' \t\r\n') = '' then
    raise exception 'alteracao exige motivo: use as funcoes admin_update_*'
      using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger proposals_2_require_reason before update on public.proposals
  for each row execute function public.require_change_reason();
create trigger news_1_require_reason before update on public.news
  for each row execute function public.require_change_reason();
create trigger candidates_1_require_reason before update on public.candidates
  for each row execute function public.require_change_reason();
create trigger analyses_1_require_reason before update on public.analyses
  for each row execute function public.require_change_reason();

-- ---------------------------------------------------------------------------
-- R18: publicar/corrigir proposta exige fonte com trecho preenchido
-- ---------------------------------------------------------------------------

create function public.proposals_publish_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('publicada', 'corrigida')
     and not exists (
       select 1 from public.sources s
       where s.proposal_id = new.id
         and length(btrim(s.excerpt)) > 0
     ) then
    raise exception 'proposta nao pode ser publicada sem ao menos uma fonte com trecho (excerpt) preenchido'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger proposals_3_publish_rule before update on public.proposals
  for each row execute function public.proposals_publish_rule();

-- ---------------------------------------------------------------------------
-- AFTER UPDATE: grava change_log (security definer: authenticated nao insere)
-- ---------------------------------------------------------------------------

create function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.change_log (table_name, row_id, old_value, new_value, reason, source_id, author)
  values (
    tg_table_name,
    (to_jsonb(new) ->> 'id')::uuid,
    to_jsonb(old),
    to_jsonb(new),
    current_setting('app.change_reason', true),
    nullif(current_setting('app.change_source_id', true), '')::uuid,
    coalesce(nullif(current_setting('app.change_author', true), ''), auth.jwt() ->> 'email')
  );
  return null;
end;
$$;

create trigger proposals_log_change after update on public.proposals
  for each row execute function public.log_change();
create trigger news_log_change after update on public.news
  for each row execute function public.log_change();
create trigger candidates_log_change after update on public.candidates
  for each row execute function public.log_change();
create trigger analyses_log_change after update on public.analyses
  for each row execute function public.log_change();

revoke all on function public.proposals_force_review() from public, anon, authenticated;
revoke all on function public.require_change_reason() from public, anon, authenticated;
revoke all on function public.proposals_publish_rule() from public, anon, authenticated;
revoke all on function public.log_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auxiliar das RPCs (interna, sem EXECUTE para anon/authenticated)
-- ---------------------------------------------------------------------------

-- Valida patch e motivo e grava as GUCs locais da transacao.
create function public.editorial_begin(
  p_patch jsonb, p_reason text, p_source_id uuid, p_allowed text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unknown text[];
begin
  if p_reason is null or btrim(p_reason, E' \t\r\n') = '' then
    raise exception 'motivo da alteracao e obrigatorio' using errcode = 'P0001';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'patch deve ser um objeto json' using errcode = 'P0001';
  end if;
  select array_agg(k order by k) into v_unknown
  from jsonb_object_keys(p_patch) as k
  where k <> all (p_allowed);
  if v_unknown is not null then
    raise exception 'campos nao editaveis: %', array_to_string(v_unknown, ', ')
      using errcode = 'P0001';
  end if;

  perform set_config('app.change_reason', p_reason, true);
  perform set_config('app.change_source_id', coalesce(p_source_id::text, ''), true);
  perform set_config('app.change_author', coalesce(auth.jwt() ->> 'email', ''), true);
end;
$$;

-- Limpa as GUCs para que um UPDATE direto depois da RPC, na mesma transacao,
-- nao reaproveite motivo velho.
create function public.editorial_end()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.change_reason', '', true);
  perform set_config('app.change_source_id', '', true);
  perform set_config('app.change_author', '', true);
end;
$$;

revoke all on function public.editorial_begin(jsonb, text, uuid, text[]) from public, anon, authenticated;
revoke all on function public.editorial_end() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs do admin. O patch e aplicado com jsonb_populate_record sobre a linha
-- atual (sem SQL dinamico); chaves fora da lista branca sao rejeitadas.
-- Nunca editaveis: id, slug, created_at, updated_at.
-- ---------------------------------------------------------------------------

create function public.admin_update_proposal(
  p_id uuid, p_patch jsonb, p_reason text, p_source_id uuid default null
)
returns public.proposals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.proposals;
  v_rec public.proposals;
  v_new public.proposals;
begin
  if not public.is_admin() then
    raise exception 'acesso negado: apenas administradores' using errcode = '42501';
  end if;
  perform public.editorial_begin(p_patch, p_reason, p_source_id,
    array['candidate_id', 'theme_id', 'description', 'source_kind', 'reference_year', 'status']);

  select * into v_old from public.proposals where id = p_id for update;
  if not found then
    raise exception 'proposals % nao encontrado', p_id using errcode = 'P0002';
  end if;

  v_rec := jsonb_populate_record(v_old, p_patch);
  update public.proposals set
    candidate_id = v_rec.candidate_id,
    theme_id = v_rec.theme_id,
    description = v_rec.description,
    source_kind = v_rec.source_kind,
    reference_year = v_rec.reference_year,
    status = v_rec.status
  where id = p_id
  returning * into v_new;

  perform public.editorial_end();
  return v_new;
end;
$$;

create function public.admin_update_news(
  p_id uuid, p_patch jsonb, p_reason text, p_source_id uuid default null
)
returns public.news
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.news;
  v_rec public.news;
  v_new public.news;
begin
  if not public.is_admin() then
    raise exception 'acesso negado: apenas administradores' using errcode = '42501';
  end if;
  perform public.editorial_begin(p_patch, p_reason, p_source_id,
    array['title', 'body', 'category', 'badge', 'source_url', 'status', 'published_at']);

  select * into v_old from public.news where id = p_id for update;
  if not found then
    raise exception 'news % nao encontrado', p_id using errcode = 'P0002';
  end if;

  v_rec := jsonb_populate_record(v_old, p_patch);
  update public.news set
    title = v_rec.title,
    body = v_rec.body,
    category = v_rec.category,
    badge = v_rec.badge,
    source_url = v_rec.source_url,
    status = v_rec.status,
    published_at = v_rec.published_at
  where id = p_id
  returning * into v_new;

  perform public.editorial_end();
  return v_new;
end;
$$;

create function public.admin_update_candidate(
  p_id uuid, p_patch jsonb, p_reason text, p_source_id uuid default null
)
returns public.candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.candidates;
  v_rec public.candidates;
  v_new public.candidates;
begin
  if not public.is_admin() then
    raise exception 'acesso negado: apenas administradores' using errcode = '42501';
  end if;
  perform public.editorial_begin(p_patch, p_reason, p_source_id,
    array['name', 'ticket_name', 'vice', 'status', 'bio', 'club_history', 'trajectory', 'photo_url']);

  select * into v_old from public.candidates where id = p_id for update;
  if not found then
    raise exception 'candidates % nao encontrado', p_id using errcode = 'P0002';
  end if;

  v_rec := jsonb_populate_record(v_old, p_patch);
  update public.candidates set
    name = v_rec.name,
    ticket_name = v_rec.ticket_name,
    vice = v_rec.vice,
    status = v_rec.status,
    bio = v_rec.bio,
    club_history = v_rec.club_history,
    trajectory = v_rec.trajectory,
    photo_url = v_rec.photo_url
  where id = p_id
  returning * into v_new;

  perform public.editorial_end();
  return v_new;
end;
$$;

create function public.admin_update_analysis(
  p_id uuid, p_patch jsonb, p_reason text, p_source_id uuid default null
)
returns public.analyses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.analyses;
  v_rec public.analyses;
  v_new public.analyses;
begin
  if not public.is_admin() then
    raise exception 'acesso negado: apenas administradores' using errcode = '42501';
  end if;
  perform public.editorial_begin(p_patch, p_reason, p_source_id,
    array['title', 'facts', 'candidate_statements', 'editorial_interpretation', 'status', 'published_at']);

  select * into v_old from public.analyses where id = p_id for update;
  if not found then
    raise exception 'analyses % nao encontrado', p_id using errcode = 'P0002';
  end if;

  v_rec := jsonb_populate_record(v_old, p_patch);
  update public.analyses set
    title = v_rec.title,
    facts = v_rec.facts,
    candidate_statements = v_rec.candidate_statements,
    editorial_interpretation = v_rec.editorial_interpretation,
    status = v_rec.status,
    published_at = v_rec.published_at
  where id = p_id
  returning * into v_new;

  perform public.editorial_end();
  return v_new;
end;
$$;

revoke all on function public.admin_update_proposal(uuid, jsonb, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_update_news(uuid, jsonb, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_update_candidate(uuid, jsonb, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.admin_update_analysis(uuid, jsonb, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_update_proposal(uuid, jsonb, text, uuid) to authenticated;
grant execute on function public.admin_update_news(uuid, jsonb, text, uuid) to authenticated;
grant execute on function public.admin_update_candidate(uuid, jsonb, text, uuid) to authenticated;
grant execute on function public.admin_update_analysis(uuid, jsonb, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Leitura completa do change_log (com author) so para o admin
-- ---------------------------------------------------------------------------

create function public.admin_change_log()
returns setof public.change_log
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'acesso negado: apenas administradores' using errcode = '42501';
  end if;
  return query select * from public.change_log order by changed_at desc, id;
end;
$$;

revoke all on function public.admin_change_log() from public, anon, authenticated, service_role;
grant execute on function public.admin_change_log() to authenticated;
