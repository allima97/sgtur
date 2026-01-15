-- Criação de Viagens + Acompanhantes e policies básicas.
-- Ajuste os filtros de company_id conforme seu modelo (claim/tabela intermediária).

-- Garante função gen_random_uuid (Supabase já traz pgcrypto, mas deixamos explícito).
create extension if not exists "pgcrypto";

-- 1) Viagens (criar primeiro para servir de FK)
create table if not exists public.viagens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid references public.vendas(id) on delete set null,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  company_id uuid not null references public.companies(id),
  responsavel_user_id uuid references public.users(id),
  origem text,
  destino text,
  data_inicio date,
  data_fim date,
  status text not null default 'planejada' check (status in ('planejada','confirmada','em_viagem','concluida','cancelada')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_viagens_ref check (venda_id is not null or orcamento_id is not null)
);
create index if not exists idx_viagens_company_status on public.viagens (company_id, status);

-- 2) Acompanhantes do cliente
create table if not exists public.cliente_acompanhantes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  nome_completo text not null,
  cpf text,
  rg text,
  telefone text,
  grau_parentesco text,
  data_nascimento date,
  observacoes text,
  ativo boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_cliente_acompanhantes_cpf_cliente
  on public.cliente_acompanhantes (cliente_id, cpf) where cpf is not null;

-- 3) Acompanhantes vinculados à viagem
create table if not exists public.viagem_acompanhantes (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.viagens(id) on delete cascade,
  acompanhante_id uuid not null references public.cliente_acompanhantes(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  papel text check (papel in ('passageiro', 'responsavel')),
  documento_url text,
  observacoes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_viagem_acompanhantes_viagem on public.viagem_acompanhantes (viagem_id);

-- 4) RLS (ajuste company_id para o seu modelo de tenancy; inclui bypass de admin)
alter table public.viagens enable row level security;
drop policy if exists viagens_select on public.viagens;
create policy viagens_select on public.viagens
  for select using (
    is_admin(auth.uid())
    or company_id = (select u.company_id from public.users u where u.id = auth.uid())
  );
drop policy if exists viagens_write on public.viagens;
create policy viagens_write on public.viagens
  for all using (
    is_admin(auth.uid())
    or company_id = (select u.company_id from public.users u where u.id = auth.uid())
  );

alter table public.cliente_acompanhantes enable row level security;
drop policy if exists cliente_acompanhantes_select on public.cliente_acompanhantes;
create policy cliente_acompanhantes_select on public.cliente_acompanhantes
  for select using (
    is_admin(auth.uid())
    or company_id = (select u.company_id from public.users u where u.id = auth.uid())
  );
drop policy if exists cliente_acompanhantes_write on public.cliente_acompanhantes;
create policy cliente_acompanhantes_write on public.cliente_acompanhantes
  for all using (
    is_admin(auth.uid())
    or company_id = (select u.company_id from public.users u where u.id = auth.uid())
  );

alter table public.viagem_acompanhantes enable row level security;
drop policy if exists viagem_acompanhantes_select on public.viagem_acompanhantes;
create policy viagem_acompanhantes_select on public.viagem_acompanhantes
  for select using (
    is_admin(auth.uid())
    or exists (
      select 1 from public.viagens v
      where v.id = viagem_id
        and v.company_id = (select u.company_id from public.users u where u.id = auth.uid())
    )
  );
drop policy if exists viagem_acompanhantes_write on public.viagem_acompanhantes;
create policy viagem_acompanhantes_write on public.viagem_acompanhantes
  for all using (
    is_admin(auth.uid())
    or exists (
      select 1 from public.viagens v
      where v.id = viagem_id
        and v.company_id = (select u.company_id from public.users u where u.id = auth.uid())
    )
  );

-- Se usar claim de tenant, troque os trechos com SELECT company_id por current_setting('request.jwt.claims.company_id', true)::uuid.
