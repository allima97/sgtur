-- 2026-02-22: remove duplicatas antigas em auth.users para desbloquear cadastros

delete from auth.users
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by lower(email)
        order by created_at desc
      ) as rn
    from auth.users
    where email is not null
      and email <> ''
      and is_sso_user = false
  ) duplicates
  where duplicates.rn > 1
);
