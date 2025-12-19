ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
