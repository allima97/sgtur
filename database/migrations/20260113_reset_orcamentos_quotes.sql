-- 2026-01-13: reset legacy orcamentos/quotes domain and rebuild new quote schema.

-- Drop legacy functions related to quotes/orcamentos.
drop function if exists public.remover_quote_item(uuid);
drop function if exists public.enviar_quote(uuid);

-- Drop legacy tables.
drop table if exists public.orcamento_itens cascade;
drop table if exists public.orcamento_interacoes cascade;
drop table if exists public.orcamentos cascade;

drop table if exists public.quote_item_segment cascade;
drop table if exists public.quote_item cascade;
drop table if exists public.quote_discount cascade;
drop table if exists public.quote_import_log cascade;
drop table if exists public.quote cascade;

drop type if exists public.quote_status cascade;

-- New schema.
create type public.quote_status as enum (
  'DRAFT',
  'IMPORTED',
  'CONFIRMED',
  'FAILED'
);

create table public.quote (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clientes(id) on delete set null,
  status public.quote_status not null default 'DRAFT',
  currency text not null default 'BRL',
  total numeric not null default 0,
  average_confidence numeric,
  source_file_path text,
  source_file_url text,
  raw_json jsonb not null default '{}'::jsonb,
  constraint quote_pkey primary key (id)
);

create index if not exists quote_created_by_idx on public.quote (created_by);
create index if not exists quote_status_idx on public.quote (status);

create table public.quote_item (
  id uuid not null default gen_random_uuid(),
  quote_id uuid not null references public.quote(id) on delete cascade,
  item_type text not null,
  title text,
  product_name text,
  city_name text,
  cidade_id uuid references public.cidades(id) on delete set null,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  total_amount numeric not null default 0,
  start_date date,
  end_date date,
  currency text not null default 'BRL',
  confidence numeric,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_item_pkey primary key (id)
);

create index if not exists quote_item_quote_id_idx on public.quote_item (quote_id);

create table public.quote_item_segment (
  id uuid not null default gen_random_uuid(),
  quote_item_id uuid not null references public.quote_item(id) on delete cascade,
  segment_type text not null,
  data jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  constraint quote_item_segment_pkey primary key (id)
);

create index if not exists quote_item_segment_item_idx on public.quote_item_segment (quote_item_id);

create table public.quote_import_log (
  id uuid not null default gen_random_uuid(),
  quote_id uuid not null references public.quote(id) on delete cascade,
  level text not null default 'INFO',
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint quote_import_log_pkey primary key (id)
);

create index if not exists quote_import_log_quote_idx on public.quote_import_log (quote_id);

-- RLS.
alter table public.quote enable row level security;
create policy quote_read_own on public.quote
  for select using (created_by = auth.uid());
create policy quote_insert_own on public.quote
  for insert with check (created_by = auth.uid());
create policy quote_update_own on public.quote
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy quote_delete_own on public.quote
  for delete using (created_by = auth.uid());

alter table public.quote_item enable row level security;
create policy quote_item_read_own on public.quote_item
  for select using (
    exists (
      select 1 from public.quote q
      where q.id = quote_item.quote_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_item_insert_own on public.quote_item
  for insert with check (
    exists (
      select 1 from public.quote q
      where q.id = quote_item.quote_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_item_update_own on public.quote_item
  for update using (
    exists (
      select 1 from public.quote q
      where q.id = quote_item.quote_id
        and q.created_by = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.quote q
      where q.id = quote_item.quote_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_item_delete_own on public.quote_item
  for delete using (
    exists (
      select 1 from public.quote q
      where q.id = quote_item.quote_id
        and q.created_by = auth.uid()
    )
  );

alter table public.quote_item_segment enable row level security;
create policy quote_item_segment_read_own on public.quote_item_segment
  for select using (
    exists (
      select 1 from public.quote_item qi
      join public.quote q on q.id = qi.quote_id
      where qi.id = quote_item_segment.quote_item_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_item_segment_insert_own on public.quote_item_segment
  for insert with check (
    exists (
      select 1 from public.quote_item qi
      join public.quote q on q.id = qi.quote_id
      where qi.id = quote_item_segment.quote_item_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_item_segment_update_own on public.quote_item_segment
  for update using (
    exists (
      select 1 from public.quote_item qi
      join public.quote q on q.id = qi.quote_id
      where qi.id = quote_item_segment.quote_item_id
        and q.created_by = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.quote_item qi
      join public.quote q on q.id = qi.quote_id
      where qi.id = quote_item_segment.quote_item_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_item_segment_delete_own on public.quote_item_segment
  for delete using (
    exists (
      select 1 from public.quote_item qi
      join public.quote q on q.id = qi.quote_id
      where qi.id = quote_item_segment.quote_item_id
        and q.created_by = auth.uid()
    )
  );

alter table public.quote_import_log enable row level security;
create policy quote_import_log_read_own on public.quote_import_log
  for select using (
    exists (
      select 1 from public.quote q
      where q.id = quote_import_log.quote_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_import_log_insert_own on public.quote_import_log
  for insert with check (
    exists (
      select 1 from public.quote q
      where q.id = quote_import_log.quote_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_import_log_update_own on public.quote_import_log
  for update using (
    exists (
      select 1 from public.quote q
      where q.id = quote_import_log.quote_id
        and q.created_by = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.quote q
      where q.id = quote_import_log.quote_id
        and q.created_by = auth.uid()
    )
  );
create policy quote_import_log_delete_own on public.quote_import_log
  for delete using (
    exists (
      select 1 from public.quote q
      where q.id = quote_import_log.quote_id
        and q.created_by = auth.uid()
    )
  );

-- Storage bucket for PDFs.
insert into storage.buckets (id, name, public)
values ('quotes', 'quotes', true)
on conflict (id) do nothing;

update storage.buckets
set public = true
where id = 'quotes';

create policy quotes_storage_read_own on storage.objects
  for select using (bucket_id = 'quotes' and auth.uid() = owner);
create policy quotes_storage_insert_own on storage.objects
  for insert with check (bucket_id = 'quotes' and auth.uid() = owner);
create policy quotes_storage_update_own on storage.objects
  for update using (bucket_id = 'quotes' and auth.uid() = owner)
  with check (bucket_id = 'quotes' and auth.uid() = owner);
create policy quotes_storage_delete_own on storage.objects
  for delete using (bucket_id = 'quotes' and auth.uid() = owner);
