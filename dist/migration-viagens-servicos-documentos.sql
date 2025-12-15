-- Tabelas de serviços e documentos da viagem, com RLS.

create extension if not exists "pgcrypto";

-- SERVIÇOS DA VIAGEM
create table if not exists public.viagem_servicos (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.viagens(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  tipo text check (tipo in ('aereo','hotel','terrestre','seguro','passeio','outro')),
  fornecedor text,
  descricao text,
  status text default 'ativo',
  data_inicio date,
  data_fim date,
  valor numeric(14,2),
  moeda text default 'BRL',
  voucher_url text,
  observacoes text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_viagem_servicos_viagem on public.viagem_servicos (viagem_id);
create index if not exists idx_viagem_servicos_company on public.viagem_servicos (company_id);

-- DOCUMENTOS DA VIAGEM
create table if not exists public.viagem_documentos (
  id uuid primary key default gen_random_uuid(),
  viagem_id uuid not null references public.viagens(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  titulo text not null,
  tipo text check (tipo in ('voucher','bilhete','roteiro','seguro','outro')),
  url text,
  mime_type text,
  size_bytes bigint,
  expires_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_viagem_documentos_viagem on public.viagem_documentos (viagem_id);
create index if not exists idx_viagem_documentos_company on public.viagem_documentos (company_id);

-- RLS: segue padrão de company_id + bypass admin
alter table public.viagem_servicos enable row level security;
drop policy if exists viagem_servicos_select on public.viagem_servicos;
create policy viagem_servicos_select on public.viagem_servicos
  for select using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );
drop policy if exists viagem_servicos_write on public.viagem_servicos;
create policy viagem_servicos_write on public.viagem_servicos
  for all using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );

alter table public.viagem_documentos enable row level security;
drop policy if exists viagem_documentos_select on public.viagem_documentos;
create policy viagem_documentos_select on public.viagem_documentos
  for select using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );
drop policy if exists viagem_documentos_write on public.viagem_documentos;
create policy viagem_documentos_write on public.viagem_documentos
  for all using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );

-- Observação: bucket sugerido para documentos: "viagens" (public ou com signed URLs).
