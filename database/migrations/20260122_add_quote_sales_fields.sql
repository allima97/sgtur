-- 2026-01-22: add sales-related fields to quotes.
alter table public.quote
  add column if not exists destino_cidade_id uuid references public.cidades(id) on delete set null,
  add column if not exists data_embarque date,
  add column if not exists data_final date,
  add column if not exists last_interaction_at timestamptz;
