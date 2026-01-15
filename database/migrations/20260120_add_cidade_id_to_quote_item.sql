-- 2026-01-20: allow quote_item to reference cidades via cidade_id.

alter table public.quote_item
  add column if not exists cidade_id uuid references public.cidades(id) on delete set null;
