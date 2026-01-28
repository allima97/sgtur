-- 2026-02-19: flag de usuários criados por gestor

alter table public.users
  add column if not exists created_by_gestor boolean not null default false;
