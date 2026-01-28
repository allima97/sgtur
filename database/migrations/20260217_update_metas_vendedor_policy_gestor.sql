-- 2026-02-17: permitir gestor atualizar metas próprias e manter controle de equipe

create or replace function public.is_gestor(uid uuid)
returns boolean
language sql stable security definer as $$
  select coalesce(
    upper(
      coalesce(
        (
          select ut.name
          from public.user_types ut
          join public.users u on u.id = uid and u.user_type_id = ut.id
        ),
        ''
      )
    ) like '%GESTOR%',
    false
  );
$$;

alter table public.metas_vendedor enable row level security;

drop policy if exists "metas_vendedor_write" on public.metas_vendedor;
create policy "metas_vendedor_write" on public.metas_vendedor
  for all using (
    is_admin(auth.uid())
    or (is_gestor(auth.uid()) and vendedor_id = auth.uid())
    or vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
  );
