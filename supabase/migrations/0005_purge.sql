-- Observatório Santista 2026: retenção de dados pessoais.
--
-- submitter_hash: hash diário e irreversível de IP+user-agent de quem enviou um
-- pedido de correção, usado só para limitar abuso (5 pedidos por hora).
--
-- purge_expired() é chamada todo dia pela rota /api/cron/purge (service_role):
--   1. apaga vote_hashes com mais de 7 dias;
--   2. zera submitter_hash de pedidos com mais de 7 dias;
--   3. apaga o e-mail de pedidos tratados há mais de 90 dias (o texto fica).
-- voter_tokens e vote_events nunca são tocadas. É idempotente.

alter table public.correction_requests add column submitter_hash text;

create index correction_requests_submitter_hash_created_at_idx
  on public.correction_requests (submitter_hash, created_at);

create function public.purge_expired()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.vote_hashes
  where created_at < now() - interval '7 days';

  update public.correction_requests
  set submitter_hash = null
  where submitter_hash is not null
    and created_at < now() - interval '7 days';

  update public.correction_requests
  set email = null
  where email is not null
    and handled_at is not null
    and handled_at < now() - interval '90 days';
end;
$$;

revoke all on function public.purge_expired() from public, anon, authenticated;
grant execute on function public.purge_expired() to service_role;
