-- 2026-02-14: tighten access to modulo_acesso (self-read, admin write)

alter table public.modulo_acesso enable row level security;

drop policy if exists "modulo_acesso_select" on public.modulo_acesso;
create policy "modulo_acesso_select" on public.modulo_acesso
  for select using (
    is_admin(auth.uid())
    or usuario_id = auth.uid()
  );

drop policy if exists "modulo_acesso_insert_admin" on public.modulo_acesso;
create policy "modulo_acesso_insert_admin" on public.modulo_acesso
  for insert with check (is_admin(auth.uid()));

drop policy if exists "modulo_acesso_update_admin" on public.modulo_acesso;
create policy "modulo_acesso_update_admin" on public.modulo_acesso
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

drop policy if exists "modulo_acesso_delete_admin" on public.modulo_acesso;
create policy "modulo_acesso_delete_admin" on public.modulo_acesso
  for delete using (is_admin(auth.uid()));
