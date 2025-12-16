alter table public.produtos
  add column if not exists fornecedor_id uuid references public.fornecedores(id);
create index if not exists idx_produtos_fornecedor on public.produtos (fornecedor_id);
