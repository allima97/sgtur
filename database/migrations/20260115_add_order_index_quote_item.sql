-- 2026-01-15: add order_index to quote_item to persist manual ordering.

alter table public.quote_item
  add column if not exists order_index integer;

with ranked as (
  select id,
         row_number() over (partition by quote_id order by created_at) - 1 as rn
  from public.quote_item
)
update public.quote_item qi
set order_index = ranked.rn
from ranked
where qi.id = ranked.id;

alter table public.quote_item
  alter column order_index set default 0,
  alter column order_index set not null;

create index if not exists quote_item_order_idx
  on public.quote_item (quote_id, order_index);
