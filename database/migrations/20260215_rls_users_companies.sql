-- 2026-02-15: RLS for users/companies (admin full, user self)

-- USERS
alter table public.users enable row level security;

drop policy if exists "users_select_self_or_admin" on public.users;
create policy "users_select_self_or_admin" on public.users
  for select using (
    is_admin(auth.uid())
    or id = auth.uid()
  );

drop policy if exists "users_insert_self_or_admin" on public.users;
create policy "users_insert_self_or_admin" on public.users
  for insert with check (
    is_admin(auth.uid())
    or id = auth.uid()
  );

drop policy if exists "users_update_self_or_admin" on public.users;
create policy "users_update_self_or_admin" on public.users
  for update using (
    is_admin(auth.uid())
    or id = auth.uid()
  )
  with check (
    is_admin(auth.uid())
    or id = auth.uid()
  );

drop policy if exists "users_delete_admin" on public.users;
create policy "users_delete_admin" on public.users
  for delete using (is_admin(auth.uid()));

-- COMPANIES
alter table public.companies enable row level security;

drop policy if exists "companies_select_admin" on public.companies;
create policy "companies_select_admin" on public.companies
  for select using (is_admin(auth.uid()));

drop policy if exists "companies_write_admin" on public.companies;
create policy "companies_write_admin" on public.companies
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
