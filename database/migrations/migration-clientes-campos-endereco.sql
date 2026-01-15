-- Adiciona campos de endereço/contato em clientes se não existirem.

alter table public.clientes
  add column if not exists whatsapp text,
  add column if not exists cep text,
  add column if not exists endereco text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists rg text;

