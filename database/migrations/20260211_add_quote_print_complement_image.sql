alter table public.quote_print_settings
  add column if not exists imagem_complementar_url text,
  add column if not exists imagem_complementar_path text;
