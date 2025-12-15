-- Helpers
create or replace function public.is_admin(uid uuid)
returns boolean
language sql stable as $$
  select coalesce(
    upper(coalesce((select ut.name from public.user_types ut join public.users u on u.id = uid and u.user_type_id = ut.id), '')) like '%ADMIN%',
    false
  );
$$;

-- ORCAMENTOS
alter table public.orcamentos enable row level security;

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

-- ORCAMENTO_INTERACOES
alter table public.orcamento_interacoes enable row level security;

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

-- VENDAS
alter table public.vendas enable row level security;

drop policy if exists "vendas_select" on public.vendas;
create policy "vendas_select" on public.vendas
  for select using (
    is_admin(auth.uid())
    or vendedor_id = auth.uid()
    or vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
  );

drop policy if exists "vendas_write" on public.vendas;
create policy "vendas_write" on public.vendas
  for all using (
    is_admin(auth.uid())
    or vendedor_id = auth.uid()
    or vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
  );

-- VENDAS_RECIBOS
alter table public.vendas_recibos enable row level security;

drop policy if exists "vendas_recibos_select" on public.vendas_recibos;
create policy "vendas_recibos_select" on public.vendas_recibos
  for select using (
    exists (
      select 1 from public.vendas v
      where v.id = vendas_recibos.venda_id
        and (
          is_admin(auth.uid())
          or v.vendedor_id = auth.uid()
          or v.vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
        )
    )
  );

drop policy if exists "vendas_recibos_write" on public.vendas_recibos;
create policy "vendas_recibos_write" on public.vendas_recibos
  for all using (
    exists (
      select 1 from public.vendas v
      where v.id = vendas_recibos.venda_id
        and (
          is_admin(auth.uid())
          or v.vendedor_id = auth.uid()
          or v.vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
        )
    )
  );

-- METAS VENDEDOR
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

-- METAS VENDEDOR PRODUTO
alter table public.metas_vendedor_produto enable row level security;

drop policy if exists "metas_vendedor_produto_select" on public.metas_vendedor_produto;
create policy "metas_vendedor_produto_select" on public.metas_vendedor_produto
  for select using (
    exists (
      select 1 from public.metas_vendedor mv
      where mv.id = metas_vendedor_produto.meta_vendedor_id
        and (
          is_admin(auth.uid())
          or mv.vendedor_id = auth.uid()
          or mv.vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
        )
    )
  );

drop policy if exists "metas_vendedor_produto_write" on public.metas_vendedor_produto;
create policy "metas_vendedor_produto_write" on public.metas_vendedor_produto
  for all using (
    exists (
      select 1 from public.metas_vendedor mv
      where mv.id = metas_vendedor_produto.meta_vendedor_id
        and (
          is_admin(auth.uid())
          or mv.vendedor_id in (select gv.vendedor_id from public.gestor_vendedor gv where gv.gestor_id = auth.uid())
        )
    )
  );

-- DASHBOARD WIDGETS
alter table public.dashboard_widgets enable row level security;

drop policy if exists "dashboard_widgets_select" on public.dashboard_widgets;
create policy "dashboard_widgets_select" on public.dashboard_widgets
  for select using (usuario_id = auth.uid());

drop policy if exists "dashboard_widgets_write" on public.dashboard_widgets;
create policy "dashboard_widgets_write" on public.dashboard_widgets
  for all using (usuario_id = auth.uid());

-- CRON LOG ALERTAS (visualização opcional só admin)
alter table public.cron_log_alertas enable row level security;
drop policy if exists "cron_log_select_admin" on public.cron_log_alertas;
create policy "cron_log_select_admin" on public.cron_log_alertas
  for select using (is_admin(auth.uid()));

-- VIAGENS (usa company_id; ajuste para claim se aplicável)
alter table public.viagens enable row level security;
drop policy if exists "viagens_select" on public.viagens;
create policy "viagens_select" on public.viagens
  for select using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );
drop policy if exists "viagens_write" on public.viagens;
create policy "viagens_write" on public.viagens
  for all using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );

-- CLIENTE_ACOMPANHANTES (multi-tenant por company_id)
alter table public.cliente_acompanhantes enable row level security;
drop policy if exists "cliente_acompanhantes_select" on public.cliente_acompanhantes;
create policy "cliente_acompanhantes_select" on public.cliente_acompanhantes
  for select using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );
drop policy if exists "cliente_acompanhantes_write" on public.cliente_acompanhantes;
create policy "cliente_acompanhantes_write" on public.cliente_acompanhantes
  for all using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );

-- VIAGEM_ACOMPANHANTES (verifica company pela viagem vinculada)
alter table public.viagem_acompanhantes enable row level security;
drop policy if exists "viagem_acompanhantes_select" on public.viagem_acompanhantes;
create policy "viagem_acompanhantes_select" on public.viagem_acompanhantes
  for select using (
    is_admin(auth.uid())
    or exists (
      select 1 from public.viagens v
      where v.id = viagem_id
        and v.company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                                    (select u.company_id from public.users u where u.id = auth.uid()))
    )
  );
drop policy if exists "viagem_acompanhantes_write" on public.viagem_acompanhantes;
create policy "viagem_acompanhantes_write" on public.viagem_acompanhantes
  for all using (
    is_admin(auth.uid())
    or exists (
      select 1 from public.viagens v
      where v.id = viagem_id
        and v.company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                                    (select u.company_id from public.users u where u.id = auth.uid()))
    )
  );

-- VIAGEM_SERVICOS
alter table public.viagem_servicos enable row level security;
drop policy if exists "viagem_servicos_select" on public.viagem_servicos;
create policy "viagem_servicos_select" on public.viagem_servicos
  for select using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );
drop policy if exists "viagem_servicos_write" on public.viagem_servicos;
create policy "viagem_servicos_write" on public.viagem_servicos
  for all using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );

-- VIAGEM_DOCUMENTOS
alter table public.viagem_documentos enable row level security;
drop policy if exists "viagem_documentos_select" on public.viagem_documentos;
create policy "viagem_documentos_select" on public.viagem_documentos
  for select using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );
drop policy if exists "viagem_documentos_write" on public.viagem_documentos;
create policy "viagem_documentos_write" on public.viagem_documentos
  for all using (
    is_admin(auth.uid())
    or company_id = coalesce(current_setting('request.jwt.claims.company_id', true)::uuid,
                             (select u.company_id from public.users u where u.id = auth.uid()))
  );

-- CIDADES (lectura pública; manutenção restrita a administradores)
alter table public.cidades enable row level security;
drop policy if exists "cidades_select" on public.cidades;
create policy "cidades_select" on public.cidades
  for select using (true);
drop policy if exists "cidades_write" on public.cidades;
create policy "cidades_write" on public.cidades
  for all using (is_admin(auth.uid()));
