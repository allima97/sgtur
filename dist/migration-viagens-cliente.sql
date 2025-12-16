-- Adiciona cliente_id em viagens para vincular ao cadastro principal.
alter table public.viagens
  add column if not exists cliente_id uuid references public.clientes(id);

create index if not exists idx_viagens_cliente on public.viagens (cliente_id);
