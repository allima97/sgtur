-- 2024-07-26: relaciona viagens com recibos e prepara consultas conjuntas.

alter table if exists public.viagens
  add column if not exists recibo_id uuid;

alter table if exists public.viagens
  drop constraint if exists viagens_recibo_id_fkey;

alter table if exists public.viagens
  add constraint viagens_recibo_id_fkey
  foreign key (recibo_id)
  references public.vendas_recibos(id)
  on delete cascade;

create index if not exists idx_viagens_recibo_id
  on public.viagens (recibo_id);
