ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS todas_as_cidades boolean NOT NULL DEFAULT false;

ALTER TABLE public.produtos
  ALTER COLUMN cidade_id DROP NOT NULL;
