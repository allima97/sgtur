-- Habilita módulo "Operacao" / "operacao_viagens" no modulo_acesso para perfis admin/gestor.
-- Ajuste o filtro de user_types conforme seu naming.

-- 0) Ajusta check constraint para aceitar os novos módulos (permite qualquer módulo não vazio)
alter table public.modulo_acesso
  drop constraint if exists modulo_acesso_modulo_check;

alter table public.modulo_acesso
  add constraint modulo_acesso_modulo_check check (trim(coalesce(modulo, '')) <> '');

-- Admins (view/edit/delete)
insert into public.modulo_acesso (usuario_id, modulo, permissao, ativo)
select u.id, 'operacao', 'edit', true
from public.users u
left join public.user_types t on t.id = u.user_type_id
where upper(coalesce(t.name, '')) like '%ADMIN%'
  and not exists (
    select 1 from public.modulo_acesso m
    where m.usuario_id = u.id and lower(m.modulo) = 'operacao'
  );

-- Gestores (view/edit) — ajuste a string do tipo se for diferente
insert into public.modulo_acesso (usuario_id, modulo, permissao, ativo)
select u.id, 'operacao', 'edit', true
from public.users u
left join public.user_types t on t.id = u.user_type_id
where upper(coalesce(t.name, '')) like '%GESTOR%'
  and not exists (
    select 1 from public.modulo_acesso m
    where m.usuario_id = u.id and lower(m.modulo) = 'operacao'
  );

-- Opcional: vendedores apenas leitura
-- insert into public.modulo_acesso (usuario_id, modulo, permissao, ativo)
-- select u.id, 'operacao', 'view', true
-- from public.users u
-- left join public.user_types t on t.id = u.user_type_id
-- where upper(coalesce(t.name, '')) like '%VENDEDOR%'
--   and not exists (
--     select 1 from public.modulo_acesso m
--     where m.usuario_id = u.id and lower(m.modulo) = 'operacao'
--   );

-- Se já houver registros de operacao, você pode atualizar permissões:
-- update public.modulo_acesso set permissao = 'edit'
-- where modulo = 'operacao' and permissao = 'view' and usuario_id in (
--   select id from public.users u
--   join public.user_types t on t.id = u.user_type_id
--   where upper(t.name) like '%GESTOR%'
-- );
