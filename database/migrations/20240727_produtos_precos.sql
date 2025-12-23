-- 2024-07-27: adiciona valores de custo e margem em produtos.

alter table if exists public.produtos
  add column if not exists valor_neto numeric;

alter table if exists public.produtos
  add column if not exists margem numeric;

alter table if exists public.produtos
  add column if not exists valor_venda numeric;
