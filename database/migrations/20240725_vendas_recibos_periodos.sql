-- 2024-07-25: adiciona datas de início e fim em recibos (produtos da venda).

alter table if exists public.vendas_recibos
  add column if not exists data_inicio date;

alter table if exists public.vendas_recibos
  add column if not exists data_fim date;
