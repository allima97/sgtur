-- 2024-08-01: adiciona tabelas de tarifas e acomodacoes de produtos.

create table if not exists public.acomodacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_acomodacoes_nome on public.acomodacoes (nome);

create table if not exists public.produtos_tarifas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  acomodacao text not null,
  qte_pax integer not null,
  tipo text,
  validade_de date not null,
  validade_ate date not null,
  valor_neto numeric not null,
  padrao text not null check (padrao in ('Manual','Padrao')),
  margem numeric,
  valor_venda numeric not null,
  moeda text not null,
  cambio numeric not null,
  valor_em_reais numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_produtos_tarifas_produto on public.produtos_tarifas (produto_id);
