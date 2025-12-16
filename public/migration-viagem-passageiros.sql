-- Tabela de passageiros / acompanhantes vinculados à viagem (flexível para passageiros e responsáveis).
create table if not exists public.viagem_passageiros (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.viagens(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  papel text not null check (papel in ('passageiro', 'responsavel')),
  observacoes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_viagem_passageiros_viagem_cliente
  on public.viagem_passageiros (viagem_id, cliente_id);
create index if not exists idx_viagem_passageiros_viagem on public.viagem_passageiros (viagem_id);
