-- Adiciona coluna vendedor_id em orcamentos e aplica policies por vendedor/gestor/admin.

-- 1) Coluna
alter table public.orcamentos
  add column if not exists vendedor_id uuid references public.users(id);

-- 2) Opcional: backfill vendedor_id com um admin/gestor padrão (ajuste o UUID abaixo)
-- update public.orcamentos set vendedor_id = '<ADMIN_UUID>' where vendedor_id is null;

-- 3) Policies (ajusta o arquivo rls-policies.sql posteriormente)
drop policy if exists "orcamentos_select" on public.orcamentos;
create policy "orcamentos_select" on public.orcamentos
  for select using (
    is_admin(auth.uid())
    or vendedor_id = auth.uid()
    or vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
  );

drop policy if exists "orcamentos_write" on public.orcamentos;
create policy "orcamentos_write" on public.orcamentos
  for all using (
    is_admin(auth.uid())
    or vendedor_id = auth.uid()
    or vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
  );

drop policy if exists "orcamento_interacoes_select" on public.orcamento_interacoes;
create policy "orcamento_interacoes_select" on public.orcamento_interacoes
  for select using (
    exists (
      select 1 from public.orcamentos o
      where o.id = orcamento_id
        and (
          is_admin(auth.uid())
          or o.vendedor_id = auth.uid()
          or o.vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
        )
    )
  );

drop policy if exists "orcamento_interacoes_write" on public.orcamento_interacoes;
create policy "orcamento_interacoes_write" on public.orcamento_interacoes
  for all using (
    exists (
      select 1 from public.orcamentos o
      where o.id = orcamento_id
        and (
          is_admin(auth.uid())
          or o.vendedor_id = auth.uid()
          or o.vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
        )
    )
  );
