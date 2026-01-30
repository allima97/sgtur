-- 2026-02-21: garante upsert do perfil mínimo após criação no auth.users

create or replace function public.ensure_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    nome_completo,
    uso_individual,
    company_id,
    user_type_id,
    active,
    created_by_gestor,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    null,
    true,
    null,
    null,
    true,
    false,
    timezone('UTC', now()),
    timezone('UTC', now())
  )
  on conflict on constraint users_email_partial_key do update
    set
      id = excluded.id,
      updated_at = timezone('UTC', now()),
      active = coalesce(users.active, excluded.active, true),
      uso_individual = coalesce(users.uso_individual, excluded.uso_individual, true);

  return new;
end;
$$;

drop trigger if exists trg_ensure_user_profile on auth.users;
create trigger trg_ensure_user_profile
  after insert on auth.users
  for each row
  execute function public.ensure_user_profile();
