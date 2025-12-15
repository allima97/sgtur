-- Adiciona company_id em clientes (FK companies) e opcional backfill.

-- 1) Coluna
alter table public.clientes
  add column if not exists company_id uuid references public.companies(id);

-- 2) Backfill opcional: defina o UUID da empresa padrão se só houver uma.
-- update public.clientes set company_id = '<COMPANY_ID>' where company_id is null;

-- 3) (Opcional) tornar NOT NULL se for multi-tenant estrito
-- alter table public.clientes alter column company_id set not null;

