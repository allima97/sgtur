-- 2026-02-13: Admin billing schema (plans, company billing, billing events)

-- Plans catalog
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  valor_mensal numeric not null default 0,
  moeda text not null default 'BRL',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_ativo_idx on public.plans (ativo);

-- Company billing (one row per company)
create table if not exists public.company_billing (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'trial',
  valor_mensal numeric,
  ultimo_pagamento date,
  proximo_vencimento date,
  inicio_cobranca date,
  trial_ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists company_billing_company_id_key on public.company_billing (company_id);
create index if not exists company_billing_status_idx on public.company_billing (status);

-- Billing events (history)
create table if not exists public.company_billing_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  billing_id uuid references public.company_billing(id) on delete set null,
  tipo text not null,
  status text not null default 'pending',
  valor numeric,
  moeda text not null default 'BRL',
  referencia text,
  vencimento date,
  pago_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists company_billing_events_company_idx on public.company_billing_events (company_id);
create index if not exists company_billing_events_status_idx on public.company_billing_events (status);

-- Backfill company_billing rows for existing companies
insert into public.company_billing (company_id, status)
select c.id, 'trial'
from public.companies c
where not exists (
  select 1 from public.company_billing cb where cb.company_id = c.id
);

-- Auto-create billing row when a company is created
create or replace function public.ensure_company_billing()
returns trigger
language plpgsql
as $$
begin
  insert into public.company_billing (company_id, status)
  values (new.id, 'trial')
  on conflict (company_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_company_billing_on_company on public.companies;
create trigger trg_company_billing_on_company
after insert on public.companies
for each row execute function public.ensure_company_billing();

-- RLS: Admin-only access for billing tables
alter table public.plans enable row level security;
drop policy if exists "plans_admin_all" on public.plans;
create policy "plans_admin_all" on public.plans
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

alter table public.company_billing enable row level security;
drop policy if exists "company_billing_admin_all" on public.company_billing;
create policy "company_billing_admin_all" on public.company_billing
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

alter table public.company_billing_events enable row level security;
drop policy if exists "company_billing_events_admin_all" on public.company_billing_events;
create policy "company_billing_events_admin_all" on public.company_billing_events
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
