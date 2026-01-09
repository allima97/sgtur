-- 2024-08-10: cria estrutura para circuitos e vinculo com produtos

create table if not exists public.circuitos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text,
  operador text,
  resumo text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.circuito_dias (
  id uuid primary key default gen_random_uuid(),
  circuito_id uuid not null references public.circuitos(id) on delete cascade,
  dia_numero integer not null,
  titulo text,
  descricao text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_circuito_dias_unico
  on public.circuito_dias (circuito_id, dia_numero);
create index if not exists idx_circuito_dias_circuito
  on public.circuito_dias (circuito_id);

create table if not exists public.circuito_dias_cidades (
  id uuid primary key default gen_random_uuid(),
  circuito_dia_id uuid not null references public.circuito_dias(id) on delete cascade,
  cidade_id uuid not null references public.cidades(id) on delete restrict,
  ordem integer not null default 1
);

create unique index if not exists idx_circuito_dias_cidades_unico
  on public.circuito_dias_cidades (circuito_dia_id, cidade_id);
create index if not exists idx_circuito_dias_cidades_dia
  on public.circuito_dias_cidades (circuito_dia_id);

create table if not exists public.circuito_datas (
  id uuid primary key default gen_random_uuid(),
  circuito_id uuid not null references public.circuitos(id) on delete cascade,
  data_inicio date not null,
  cidade_inicio_id uuid references public.cidades(id) on delete set null,
  dias_extra_antes integer not null default 0,
  dias_extra_depois integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_circuito_datas_circuito
  on public.circuito_datas (circuito_id);

alter table if exists public.produtos
  add column if not exists circuito_id uuid references public.circuitos(id) on delete set null;

create index if not exists idx_produtos_circuito_id
  on public.produtos (circuito_id);
