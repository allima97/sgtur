-- 2024-07-30: tabela de parâmetros de câmbio por empresa.

create table if not exists public.parametros_cambios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  owner_user_id uuid references public.users(id),
  moeda text not null,
  data date not null,
  valor numeric not null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_parametros_cambios_company_moeda_data
  on public.parametros_cambios (company_id, moeda, data);

create index if not exists idx_parametros_cambios_company_moeda
  on public.parametros_cambios (company_id, moeda);
