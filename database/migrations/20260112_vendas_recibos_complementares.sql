-- 2026-01-12: cria vinculos entre vendas e recibos complementares.

create table if not exists public.vendas_recibos_complementares (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete cascade,
  recibo_id uuid not null references public.vendas_recibos(id) on delete cascade,
  created_at timestamp with time zone default now()
);

create unique index if not exists idx_vendas_recibos_comp_un
  on public.vendas_recibos_complementares (venda_id, recibo_id);

create index if not exists idx_vendas_recibos_comp_venda
  on public.vendas_recibos_complementares (venda_id);

create index if not exists idx_vendas_recibos_comp_recibo
  on public.vendas_recibos_complementares (recibo_id);
