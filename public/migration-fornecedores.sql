-- Criação da tabela de fornecedores para empresas.
create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  localizacao text not null check (localizacao in ('brasil','exterior')),
  nome_completo text not null,
  nome_fantasia text,
  cnpj text,
  cep text,
  cidade text,
  estado text,
  telefone text,
  whatsapp text,
  telefone_emergencia text,
  responsavel text,
  tipo_faturamento text not null check (tipo_faturamento in ('pre_pago','semanal','quinzenal','mensal')),
  principais_servicos text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fornecedores_company on public.fornecedores (company_id);
