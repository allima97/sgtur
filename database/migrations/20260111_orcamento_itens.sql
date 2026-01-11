-- 2026-01-11: criar tabela de itens do orcamento.

create table if not exists public.orcamento_itens (
  id uuid not null default gen_random_uuid(),
  orcamento_id uuid not null,
  cidade_id uuid,
  tipo_produto_id uuid,
  produto_id uuid,
  periodo_inicio date,
  periodo_fim date,
  valor numeric,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint orcamento_itens_pkey primary key (id),
  constraint orcamento_itens_orcamento_id_fkey foreign key (orcamento_id)
    references public.orcamentos(id) on delete cascade,
  constraint orcamento_itens_cidade_id_fkey foreign key (cidade_id)
    references public.cidades(id) on delete set null,
  constraint orcamento_itens_tipo_produto_id_fkey foreign key (tipo_produto_id)
    references public.tipo_produtos(id) on delete set null,
  constraint orcamento_itens_produto_id_fkey foreign key (produto_id)
    references public.produtos(id) on delete set null
);

create index if not exists orcamento_itens_orcamento_idx
  on public.orcamento_itens (orcamento_id);

create index if not exists orcamento_itens_cidade_idx
  on public.orcamento_itens (cidade_id);

create index if not exists orcamento_itens_produto_idx
  on public.orcamento_itens (produto_id);

create index if not exists orcamento_itens_tipo_produto_idx
  on public.orcamento_itens (tipo_produto_id);
