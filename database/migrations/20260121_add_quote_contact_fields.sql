-- 2026-01-21: store free-text contact info on quotes.
alter table public.quote
  add column if not exists client_name text,
  add column if not exists client_whatsapp text,
  add column if not exists client_email text;
