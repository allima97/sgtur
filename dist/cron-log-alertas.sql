-- Tabela de auditoria para o cron de alertas de orçamentos
create table if not exists public.cron_log_alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  total int,
  pendentes int,
  gerados int,
  status_atualizados int,
  webhook_status text,
  email_status text,
  dry_run boolean,
  dias_status jsonb,
  canal text,
  destinatario text,
  criado_em timestamptz default now()
);

create index if not exists idx_cron_log_alertas_tipo on public.cron_log_alertas(tipo);
create index if not exists idx_cron_log_alertas_criado_em on public.cron_log_alertas(criado_em);
