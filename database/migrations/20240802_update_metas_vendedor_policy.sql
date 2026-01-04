-- Migration: Atualiza políticas de metas para usar helper de admin em vez de coluna removida (tipo_usuario).

alter table public.metas_vendedor enable row level security;

drop policy if exists "metas_vendedor_select" on public.metas_vendedor;
create policy "metas_vendedor_select" on public.metas_vendedor
  for select using (
    is_admin(auth.uid())
    or vendedor_id = auth.uid()
    or vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
  );

drop policy if exists "metas_vendedor_write" on public.metas_vendedor;
create policy "metas_vendedor_write" on public.metas_vendedor
  for all using (
    is_admin(auth.uid())
    or vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
  );
