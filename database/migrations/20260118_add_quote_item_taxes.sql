alter table public.quote_item
  add column if not exists taxes_amount numeric(12,2) not null default 0;
