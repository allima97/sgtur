create or replace function public.relatorio_vendas_por_destino(
  p_data_inicio date default null,
  p_data_fim date default null,
  p_status text default null,
  p_busca text default null,
  p_vendedor_ids uuid[] default null,
  p_ordem text default 'total',
  p_ordem_desc boolean default true,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  destino_id uuid,
  destino_nome text,
  cidade_nome text,
  quantidade integer,
  total numeric,
  ticket_medio numeric,
  total_count integer,
  total_total numeric,
  total_quantidade integer
)
language sql
stable
as $$
with params as (
  select
    greatest(coalesce(p_page, 1), 1)::int as page,
    greatest(coalesce(p_page_size, 20), 1)::int as page_size
),
base as (
  select
    v.id,
    v.destino_id,
    v.valor_total,
    v.status,
    v.vendedor_id,
    v.data_lancamento
  from vendas v
  where (p_data_inicio is null or v.data_lancamento >= p_data_inicio)
    and (p_data_fim is null or v.data_lancamento <= p_data_fim)
    and (p_status is null or p_status = '' or p_status = 'todos' or v.status = p_status)
    and (
      p_vendedor_ids is null
      or array_length(p_vendedor_ids, 1) is null
      or array_length(p_vendedor_ids, 1) = 0
      or v.vendedor_id = any(p_vendedor_ids)
    )
),
recibos as (
  select
    vr.venda_id,
    sum(coalesce(vr.valor_total, 0)) as total_recibos
  from vendas_recibos vr
  group by vr.venda_id
),
vendas_valores as (
  select
    b.id,
    b.destino_id,
    case
      when coalesce(r.total_recibos, 0) > 0 then r.total_recibos
      else coalesce(b.valor_total, 0)
    end as total_venda
  from base b
  left join recibos r on r.venda_id = b.id
),
agg as (
  select
    v.destino_id,
    p.nome as destino_nome,
    c.nome as cidade_nome,
    count(*)::int as quantidade,
    sum(v.total_venda)::numeric as total
  from vendas_valores v
  left join produtos p on p.id = v.destino_id
  left join cidades c on c.id = p.cidade_id
  group by v.destino_id, p.nome, c.nome
),
filtered as (
  select
    *,
    case when quantidade > 0 then total / quantidade else 0 end as ticket_medio
  from agg
  where (
    p_busca is null
    or p_busca = ''
    or coalesce(destino_nome, '') ilike ('%' || p_busca || '%')
    or coalesce(cidade_nome, '') ilike ('%' || p_busca || '%')
  )
),
ordered as (
  select
    *,
    case
      when p_ordem = 'quantidade' then quantidade::numeric
      when p_ordem = 'ticket' then ticket_medio
      else total
    end as order_value
  from filtered
)
  select
    destino_id,
    destino_nome,
    cidade_nome,
    quantidade,
    total,
    ticket_medio,
    total_count,
    total_total,
    total_quantidade
  from (
    with bounds as (
      select
        page,
        page_size,
        (page - 1) * page_size as start_row,
        page * page_size as end_row
      from params
    )
    select
      destino_id,
      destino_nome,
      cidade_nome,
      quantidade,
      total,
      case when quantidade > 0 then total / quantidade else 0 end as ticket_medio,
      count(*) over()::int as total_count,
      sum(total) over()::numeric as total_total,
      sum(quantidade) over()::int as total_quantidade,
      row_number() over (
        order by
          case when p_ordem_desc then -coalesce(order_value, 0) else coalesce(order_value, 0) end,
          destino_nome
      ) as rn,
      b.start_row,
      b.end_row
    from ordered
    cross join bounds b
  ) t
  where t.rn > t.start_row and t.rn <= t.end_row
  order by t.rn;
$$;

create or replace function public.relatorio_vendas_por_cliente(
  p_data_inicio date default null,
  p_data_fim date default null,
  p_status text default null,
  p_busca text default null,
  p_vendedor_ids uuid[] default null,
  p_ordem text default 'total',
  p_ordem_desc boolean default true,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  cliente_id uuid,
  cliente_nome text,
  cliente_cpf text,
  quantidade integer,
  total numeric,
  ticket_medio numeric,
  total_count integer,
  total_total numeric,
  total_quantidade integer
)
language sql
stable
as $$
with params as (
  select
    greatest(coalesce(p_page, 1), 1)::int as page,
    greatest(coalesce(p_page_size, 20), 1)::int as page_size
),
base as (
  select
    v.id,
    v.cliente_id,
    v.valor_total,
    v.status,
    v.vendedor_id,
    v.data_lancamento
  from vendas v
  where (p_data_inicio is null or v.data_lancamento >= p_data_inicio)
    and (p_data_fim is null or v.data_lancamento <= p_data_fim)
    and (p_status is null or p_status = '' or p_status = 'todos' or v.status = p_status)
    and (
      p_vendedor_ids is null
      or array_length(p_vendedor_ids, 1) is null
      or array_length(p_vendedor_ids, 1) = 0
      or v.vendedor_id = any(p_vendedor_ids)
    )
),
recibos as (
  select
    vr.venda_id,
    sum(coalesce(vr.valor_total, 0)) as total_recibos
  from vendas_recibos vr
  group by vr.venda_id
),
vendas_valores as (
  select
    b.id,
    b.cliente_id,
    case
      when coalesce(r.total_recibos, 0) > 0 then r.total_recibos
      else coalesce(b.valor_total, 0)
    end as total_venda
  from base b
  left join recibos r on r.venda_id = b.id
),
agg as (
  select
    v.cliente_id,
    c.nome as cliente_nome,
    c.cpf as cliente_cpf,
    count(*)::int as quantidade,
    sum(v.total_venda)::numeric as total
  from vendas_valores v
  left join clientes c on c.id = v.cliente_id
  group by v.cliente_id, c.nome, c.cpf
),
filtered as (
  select
    *,
    case when quantidade > 0 then total / quantidade else 0 end as ticket_medio
  from agg
  where (
    p_busca is null
    or p_busca = ''
    or coalesce(cliente_nome, '') ilike ('%' || p_busca || '%')
    or coalesce(cliente_cpf, '') ilike ('%' || p_busca || '%')
  )
),
ordered as (
  select
    *,
    case
      when p_ordem = 'quantidade' then quantidade::numeric
      when p_ordem = 'ticket' then ticket_medio
      else total
    end as order_value
  from filtered
)
select
    cliente_id,
    cliente_nome,
    cliente_cpf,
    quantidade,
    total,
    ticket_medio,
    total_count,
    total_total,
    total_quantidade
  from (
    with bounds as (
      select
        page,
        page_size,
        (page - 1) * page_size as start_row,
        page * page_size as end_row
      from params
    )
    select
      cliente_id,
      cliente_nome,
      cliente_cpf,
      quantidade,
      total,
      case when quantidade > 0 then total / quantidade else 0 end as ticket_medio,
      count(*) over()::int as total_count,
      sum(total) over()::numeric as total_total,
      sum(quantidade) over()::int as total_quantidade,
      row_number() over (
        order by
          case when p_ordem_desc then -coalesce(order_value, 0) else coalesce(order_value, 0) end,
          cliente_nome
      ) as rn,
      b.start_row,
      b.end_row
    from ordered
    cross join bounds b
  ) t
  where t.rn > t.start_row and t.rn <= t.end_row
  order by t.rn;
$$;

create or replace function public.relatorio_vendas_por_produto(
  p_data_inicio date default null,
  p_data_fim date default null,
  p_status text default null,
  p_busca text default null,
  p_tipo_produto_id uuid default null,
  p_cidade_id uuid default null,
  p_vendedor_ids uuid[] default null,
  p_ordem text default 'total',
  p_ordem_desc boolean default true,
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  produto_id uuid,
  produto_nome text,
  quantidade integer,
  total numeric,
  ticket_medio numeric,
  total_count integer,
  total_total numeric,
  total_quantidade integer
)
language sql
stable
as $$
with params as (
  select
    greatest(coalesce(p_page, 1), 1)::int as page,
    greatest(coalesce(p_page_size, 20), 1)::int as page_size
),
base as (
  select
    v.id,
    v.produto_id,
    v.destino_id,
    v.destino_cidade_id,
    v.valor_total,
    v.status,
    v.vendedor_id,
    v.data_lancamento
  from vendas v
  where (p_data_inicio is null or v.data_lancamento >= p_data_inicio)
    and (p_data_fim is null or v.data_lancamento <= p_data_fim)
    and (p_status is null or p_status = '' or p_status = 'todos' or v.status = p_status)
    and (
      p_vendedor_ids is null
      or array_length(p_vendedor_ids, 1) is null
      or array_length(p_vendedor_ids, 1) = 0
      or v.vendedor_id = any(p_vendedor_ids)
    )
),
recibos as (
  select
    vr.venda_id,
    vr.produto_id,
    vr.valor_total
  from vendas_recibos vr
),
rows as (
  select
    coalesce(r.produto_id, b.produto_id) as tipo_id,
    case
      when r.venda_id is null then coalesce(b.valor_total, 0)
      else coalesce(r.valor_total, 0)
    end as valor,
    d.nome as destino_nome,
    coalesce(b.destino_cidade_id, d.cidade_id) as cidade_id
  from base b
  left join recibos r on r.venda_id = b.id
  left join produtos d on d.id = b.destino_id
  where (
    p_tipo_produto_id is null
    or coalesce(r.produto_id, b.produto_id) = p_tipo_produto_id
  )
  and (
    p_cidade_id is null
    or coalesce(b.destino_cidade_id, d.cidade_id) = p_cidade_id
  )
),
agg as (
  select
    r.tipo_id as produto_id,
    coalesce(tp.nome, tp.tipo, '(sem produto)') as produto_nome,
    count(*)::int as quantidade,
    sum(r.valor)::numeric as total,
    bool_or(
      case
        when p_busca is null or p_busca = '' then false
        else coalesce(r.destino_nome, '') ilike ('%' || p_busca || '%')
      end
    ) as match_destino
  from rows r
  left join tipo_produtos tp on tp.id = r.tipo_id
  group by r.tipo_id, tp.nome, tp.tipo
),
filtered as (
  select
    *,
    case when quantidade > 0 then total / quantidade else 0 end as ticket_medio
  from agg
  where (
    p_busca is null
    or p_busca = ''
    or coalesce(produto_nome, '') ilike ('%' || p_busca || '%')
    or match_destino
    or exists (
      select 1
      from produtos p2
      where p2.tipo_produto = agg.produto_id
        and p2.nome ilike ('%' || p_busca || '%')
    )
  )
),
ordered as (
  select
    *,
    case
      when p_ordem = 'quantidade' then quantidade::numeric
      when p_ordem = 'ticket' then ticket_medio
      else total
    end as order_value
  from filtered
)
select
    produto_id,
    produto_nome,
    quantidade,
    total,
    ticket_medio,
    total_count,
    total_total,
    total_quantidade
  from (
    with bounds as (
      select
        page,
        page_size,
        (page - 1) * page_size as start_row,
        page * page_size as end_row
      from params
    )
    select
      produto_id,
      produto_nome,
      quantidade,
      total,
      case when quantidade > 0 then total / quantidade else 0 end as ticket_medio,
      count(*) over()::int as total_count,
      sum(total) over()::numeric as total_total,
      sum(quantidade) over()::int as total_quantidade,
      row_number() over (
        order by
          case when p_ordem_desc then -coalesce(order_value, 0) else coalesce(order_value, 0) end,
          produto_nome
      ) as rn,
      b.start_row,
      b.end_row
    from ordered
    cross join bounds b
  ) t
  where t.rn > t.start_row and t.rn <= t.end_row
  order by t.rn;
$$;
