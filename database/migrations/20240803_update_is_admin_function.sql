-- Migration: Atualiza (ou cria) a função is_admin para depender apenas de user_types

create or replace function public.is_admin(uid uuid)
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
    ) like '%ADMIN%',
    false
  );
$$;
