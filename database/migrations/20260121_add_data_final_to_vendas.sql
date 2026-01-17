-- 2026-01-21: add data_final to vendas.
alter table public.vendas
  add column if not exists data_final date;
