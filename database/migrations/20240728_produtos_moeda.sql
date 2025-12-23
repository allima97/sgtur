-- 2024-07-28: adiciona moeda/parte cambial aos produtos.

alter table if exists public.produtos
  add column if not exists moeda text default 'R$';

alter table if exists public.produtos
  add column if not exists cambio numeric;

alter table if exists public.produtos
  add column if not exists valor_em_reais numeric;
