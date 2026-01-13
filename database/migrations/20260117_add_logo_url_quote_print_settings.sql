alter table public.quote_print_settings
  add column if not exists logo_url text,
  add column if not exists logo_path text;
