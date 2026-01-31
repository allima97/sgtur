-- 2026-01-31: follow-up fields for dossiê da viagem

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS follow_up_text text,
  ADD COLUMN IF NOT EXISTS follow_up_fechado boolean NOT NULL DEFAULT false;
