-- 2026-02-10: add notes for quote interactions.
alter table public.quote
  add column if not exists last_interaction_notes text;
