-- Observatório Santista 2026: esquema base, RLS e imutabilidade dos votos.
-- Gatilhos de change_log, RPCs de admin, cast_vote e funções de resultado
-- entram em migrações posteriores.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  ticket_name text,
  vice text,
  status text not null default 'a_confirmar'
    check (status in ('a_confirmar', 'confirmada', 'desistiu')),
  bio text,
  club_history text,
  trajectory text,
  photo_url text,
  updated_at timestamptz not null default now()
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position int not null unique
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id),
  theme_id uuid not null references public.themes (id),
  description text not null,
  source_kind text not null
    check (source_kind in ('documento_da_chapa', 'entrevista_direta', 'reportagem', 'declaracao_como_presidente')),
  reference_year int,
  status text not null default 'em_revisao'
    check (status in ('em_revisao', 'publicada', 'corrigida', 'retirada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposals_candidate_theme_idx on public.proposals (candidate_id, theme_id);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id),
  url text not null,
  outlet text,
  published_on date,
  consulted_on date,
  kind text,
  excerpt text
);
create index sources_proposal_idx on public.sources (proposal_id);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text not null,
  category text not null
    check (category in ('eleicao', 'candidatos', 'propostas', 'estatuto-e-regras', 'clube', 'plataforma')),
  badge text not null
    check (badge in ('plataforma', 'terceiros', 'editorial')),
  source_url text,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'publicada', 'retirada')),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  facts text not null,
  candidate_statements text not null,
  editorial_interpretation text not null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'publicada', 'retirada')),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.change_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz not null default now(),
  reason text,
  source_id uuid,
  author text
);

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  link text,
  email text,
  status text not null default 'nova'
    check (status in ('nova', 'em_tratamento', 'tratada', 'rejeitada')),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Voto: evento anônimo e imutável. Sem hash, IP ou token aqui.
create table public.vote_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates (id),
  is_socio boolean not null,
  flag text not null default 'valid' check (flag in ('valid', 'suspicious')),
  created_at timestamptz not null default now()
);

-- Hashes ficam separados para poderem ser apagados (purga) sem tocar nos votos.
create table public.vote_hashes (
  vote_id uuid primary key references public.vote_events (id),
  voter_hash text not null,
  created_at timestamptz not null default now()
);

create table public.voter_tokens (
  token_hash text primary key,
  created_at timestamptz not null default now()
);

-- Lista de e-mails de administradores. Fica VAZIA: adicione o seu e-mail com
--   insert into public.admin_allowlist (email) values ('voce@exemplo.com');
-- (em minúsculas). Sem linhas, ninguém é admin.
create table public.admin_allowlist (
  email text primary key
);

-- ---------------------------------------------------------------------------
-- Helper de admin
-- ---------------------------------------------------------------------------

-- Admin = JWT com aal2 (TOTP) E e-mail na allowlist. A claim `email` so e confiavel
-- porque, com "Confirm email" LIGADO ([auth.email] enable_confirmations = true no
-- config.toml), contas com e-mail nao verificado nao conseguem obter JWT. Em producao
-- mantenha "Confirm email" ligado e desative signups publicos assim que a conta admin
-- existir. A logica abaixo nao checa verificacao por conta propria.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1
      from public.admin_allowlist a
      where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Imutabilidade: gatilhos que proíbem DELETE (e UPDATE/TRUNCATE em vote_events)
-- ---------------------------------------------------------------------------

create function public.forbid_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% proibido em %', tg_op, tg_table_name;
end;
$$;

create trigger candidates_no_delete before delete on public.candidates
  for each row execute function public.forbid_mutation();
create trigger proposals_no_delete before delete on public.proposals
  for each row execute function public.forbid_mutation();
create trigger sources_no_delete before delete on public.sources
  for each row execute function public.forbid_mutation();
create trigger news_no_delete before delete on public.news
  for each row execute function public.forbid_mutation();
create trigger analyses_no_delete before delete on public.analyses
  for each row execute function public.forbid_mutation();
create trigger change_log_no_delete before delete on public.change_log
  for each row execute function public.forbid_mutation();

-- TRUNCATE nao dispara gatilhos de linha: gatilho de instrucao em cada tabela protegida.
create trigger candidates_no_truncate before truncate on public.candidates
  for each statement execute function public.forbid_mutation();
create trigger proposals_no_truncate before truncate on public.proposals
  for each statement execute function public.forbid_mutation();
create trigger sources_no_truncate before truncate on public.sources
  for each statement execute function public.forbid_mutation();
create trigger news_no_truncate before truncate on public.news
  for each statement execute function public.forbid_mutation();
create trigger analyses_no_truncate before truncate on public.analyses
  for each statement execute function public.forbid_mutation();
create trigger change_log_no_truncate before truncate on public.change_log
  for each statement execute function public.forbid_mutation();

create trigger vote_events_immutable before update or delete on public.vote_events
  for each row execute function public.forbid_mutation();
create trigger vote_events_no_truncate before truncate on public.vote_events
  for each statement execute function public.forbid_mutation();

-- change_log publico so para linhas cujo registro de origem esta publico.
-- security definer: as politicas das tabelas de origem filtrariam 'retirada' para anon,
-- mas as correcoes (retirada) devem aparecer no historico publico.
create function public.change_log_is_public(p_table text, p_row uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_table
    when 'candidates' then true
    when 'proposals' then exists (
      select 1 from public.proposals p
      where p.id = p_row and p.status in ('publicada', 'corrigida', 'retirada'))
    when 'news' then exists (
      select 1 from public.news n
      where n.id = p_row and n.status in ('publicada', 'retirada'))
    when 'analyses' then exists (
      select 1 from public.analyses a
      where a.id = p_row and a.status = 'publicada')
    else false
  end;
$$;

revoke all on function public.change_log_is_public(text, uuid) from public;
grant execute on function public.change_log_is_public(text, uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------

-- O Supabase concede tudo a anon/authenticated por padrão: zera e concede só o necessário.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.candidates, public.themes, public.proposals, public.sources,
  public.news, public.analyses to anon, authenticated;

-- change_log: leitura por coluna, SEM `author` (e-mail do admin). Leitura do autor
-- pelo admin fica para a tarefa 3 (ex.: RPC security definer).
grant select (id, table_name, row_id, old_value, new_value, changed_at, reason, source_id)
  on public.change_log to anon, authenticated;

grant insert, update on public.candidates, public.themes, public.proposals, public.sources,
  public.news, public.analyses to authenticated;

grant select, update on public.correction_requests to authenticated;

-- Nada em vote_events, vote_hashes, voter_tokens e admin_allowlist para anon/authenticated.
-- Inserções em vote_events virão só pela função security definer cast_vote (tarefa 5).
revoke update, delete, truncate on public.vote_events from public, anon, authenticated, service_role;

revoke delete, truncate on public.candidates, public.proposals, public.sources, public.news,
  public.analyses, public.change_log from public, anon, authenticated, service_role;

-- change_log e trilha de auditoria: so insercao.
revoke update on public.change_log from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.candidates enable row level security;
alter table public.themes enable row level security;
alter table public.proposals enable row level security;
alter table public.sources enable row level security;
alter table public.news enable row level security;
alter table public.analyses enable row level security;
alter table public.change_log enable row level security;
alter table public.correction_requests enable row level security;
alter table public.vote_events enable row level security;
alter table public.vote_hashes enable row level security;
alter table public.voter_tokens enable row level security;
alter table public.admin_allowlist enable row level security;

-- Leitura pública
create policy candidates_public_read on public.candidates
  for select to anon, authenticated using (true);
create policy themes_public_read on public.themes
  for select to anon, authenticated using (true);
create policy proposals_public_read on public.proposals
  for select to anon, authenticated using (status in ('publicada', 'corrigida'));
create policy sources_public_read on public.sources
  for select to anon, authenticated using (
    exists (
      select 1 from public.proposals p
      where p.id = sources.proposal_id
        and p.status in ('publicada', 'corrigida')
    )
  );
create policy news_public_read on public.news
  for select to anon, authenticated using (status = 'publicada');
create policy analyses_public_read on public.analyses
  for select to anon, authenticated using (status = 'publicada');
create policy change_log_public_read on public.change_log
  for select to anon, authenticated
  using (public.change_log_is_public(table_name, row_id));

-- Leitura do admin (conteúdo não publicado)
create policy proposals_admin_read on public.proposals
  for select to authenticated using (public.is_admin());
create policy sources_admin_read on public.sources
  for select to authenticated using (public.is_admin());
create policy news_admin_read on public.news
  for select to authenticated using (public.is_admin());
create policy analyses_admin_read on public.analyses
  for select to authenticated using (public.is_admin());
create policy change_log_admin_read on public.change_log
  for select to authenticated using (public.is_admin());
create policy correction_requests_admin_read on public.correction_requests
  for select to authenticated using (public.is_admin());

-- Escrita do admin (AAL2 + e-mail na allowlist, tudo dentro de is_admin())
create policy candidates_admin_insert on public.candidates
  for insert to authenticated with check (public.is_admin());
create policy candidates_admin_update on public.candidates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy themes_admin_insert on public.themes
  for insert to authenticated with check (public.is_admin());
create policy themes_admin_update on public.themes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy proposals_admin_insert on public.proposals
  for insert to authenticated with check (public.is_admin());
create policy proposals_admin_update on public.proposals
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy sources_admin_insert on public.sources
  for insert to authenticated with check (public.is_admin());
create policy sources_admin_update on public.sources
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy news_admin_insert on public.news
  for insert to authenticated with check (public.is_admin());
create policy news_admin_update on public.news
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy analyses_admin_insert on public.analyses
  for insert to authenticated with check (public.is_admin());
create policy analyses_admin_update on public.analyses
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy correction_requests_admin_update on public.correction_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- vote_events, vote_hashes, voter_tokens, admin_allowlist: RLS ligada e nenhuma
-- política para anon/authenticated (acesso só via funções security definer).
