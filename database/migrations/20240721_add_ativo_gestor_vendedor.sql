ALTER TABLE public.gestor_vendedor
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
