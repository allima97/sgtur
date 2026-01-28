-- 2026-02-18: RLS para gestor_vendedor (gestor controla equipe da própria empresa)

alter table public.gestor_vendedor enable row level security;

drop policy if exists "gestor_vendedor_select" on public.gestor_vendedor;
create policy "gestor_vendedor_select" on public.gestor_vendedor
  for select using (
    is_admin(auth.uid())
    or gestor_id = auth.uid()
  );

drop policy if exists "gestor_vendedor_insert" on public.gestor_vendedor;
create policy "gestor_vendedor_insert" on public.gestor_vendedor
  for insert with check (
    is_admin(auth.uid())
    or (
      gestor_id = auth.uid()
      and exists (
        select 1
        from public.users u
        join public.user_types ut on ut.id = u.user_type_id
        where u.id = gestor_vendedor.vendedor_id
          and u.company_id = public.current_company_id()
          and coalesce(u.uso_individual, false) = false
          and upper(coalesce(ut.name, '')) like '%VENDEDOR%'
      )
    )
  );

drop policy if exists "gestor_vendedor_update" on public.gestor_vendedor;
create policy "gestor_vendedor_update" on public.gestor_vendedor
  for update using (
    is_admin(auth.uid())
    or gestor_id = auth.uid()
  )
  with check (
    is_admin(auth.uid())
    or (
      gestor_id = auth.uid()
      and exists (
        select 1
        from public.users u
        join public.user_types ut on ut.id = u.user_type_id
        where u.id = gestor_vendedor.vendedor_id
          and u.company_id = public.current_company_id()
          and coalesce(u.uso_individual, false) = false
          and upper(coalesce(ut.name, '')) like '%VENDEDOR%'
      )
    )
  );

drop policy if exists "gestor_vendedor_delete" on public.gestor_vendedor;
create policy "gestor_vendedor_delete" on public.gestor_vendedor
  for delete using (
    is_admin(auth.uid())
    or gestor_id = auth.uid()
  );
