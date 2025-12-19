# RLS Checklist SGVTUR - Sistema de Gerenciamento de Vendas para Turismo

Políticas sugeridas para Supabase (ajustar conforme schema real e vínculos de gestor/equipe).

## Orçamentos (`orcamentos`)
- visibilidade:
  - vendedor vê `vendedor_id = auth.uid()`
  - gestor vê `vendedor_id IN (SELECT vendedor_id FROM gestor_vendedor WHERE gestor_id = auth.uid())`
  - admin: role/meta ou tabela `user_types` contendo "ADMIN"
- writes: mesmo filtro acima

## Interações de Orçamentos (`orcamento_interacoes`)
- seguir regra de `orcamentos` via FK:
```sql
-- select
(
  exists (
    select 1
    from orcamentos o
    where o.id = orcamento_interacoes.orcamento_id
      and (
        o.vendedor_id = auth.uid()
        or o.vendedor_id in (
          select vendedor_id from gestor_vendedor where gestor_id = auth.uid()
        )
        or upper(coalesce((select ut.name from user_types ut join users u on u.id = auth.uid() and u.user_type_id = ut.id), '')) like '%ADMIN%'
      )
  )
)
```
- insert: permitir se usuário passa no check de visibilidade do orçamento.

## Vendas (`vendas`) e Recibos (`vendas_recibos`)
- select: mesmo filtro de orçamentos (vendedor = auth.uid() ou gestor de equipe ou admin).
- insert/update/delete: restringir a quem tem permissão de módulo (já tratado no app), mas no banco amarrar ao mesmo filtro + admins.

## Metas (`metas_vendedor`, `metas_vendedor_produto`)
- select:
  - vendedor vê as suas metas (`vendedor_id = auth.uid()`).
  - gestor: metas dos vendedores vinculados.
  - admin: sem filtro.
- insert/update/delete: restrito a admin/gestor (via user_type ou papel de admin) — opcionalmente bloquear vendedor comum.

## Dashboard Widgets (`dashboard_widgets`)
- select/update/delete: `usuario_id = auth.uid()`.
- insert: `usuario_id = auth.uid()`.

## Logs (`logs`)
- select: opcional expor só para admin.
- insert: livre (feito via app).

## Helpers de admin detection
- meta `user_types.name` contendo "ADMIN" (ajuste para seu schema).
- ou claim/role em `app_metadata.roles` contendo "admin".

## Dicas
- Sempre `security definer = off` (policies padrão Supabase).
- Crie views se precisar simplificar joins de gestor/vendedor.
- Teste com `auth.uid()` nulo (deve bloquear).
