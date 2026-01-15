-- Adiciona coluna active em clientes, se não existir.
alter table public.clientes
  add column if not exists active boolean default true;

