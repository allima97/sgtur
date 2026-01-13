-- 2026-01-16: parametros de impressao do orcamento por usuario.

create table if not exists public.quote_print_settings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  company_id uuid references public.companies(id),
  logo_url text,
  consultor_nome text,
  filial_nome text,
  endereco_linha1 text,
  endereco_linha2 text,
  endereco_linha3 text,
  telefone text,
  whatsapp text,
  email text,
  rodape_texto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quote_print_settings_owner_uidx
  on public.quote_print_settings (owner_user_id);

create index if not exists quote_print_settings_company_idx
  on public.quote_print_settings (company_id);

alter table public.quote_print_settings enable row level security;

drop policy if exists quote_print_settings_select_own on public.quote_print_settings;
create policy quote_print_settings_select_own
  on public.quote_print_settings
  for select
  using (owner_user_id = auth.uid());

drop policy if exists quote_print_settings_insert_own on public.quote_print_settings;
create policy quote_print_settings_insert_own
  on public.quote_print_settings
  for insert
  with check (owner_user_id = auth.uid());

drop policy if exists quote_print_settings_update_own on public.quote_print_settings;
create policy quote_print_settings_update_own
  on public.quote_print_settings
  for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

drop policy if exists quote_print_settings_delete_own on public.quote_print_settings;
create policy quote_print_settings_delete_own
  on public.quote_print_settings
  for delete
  using (owner_user_id = auth.uid());

drop trigger if exists trg_quote_print_settings_updated_at on public.quote_print_settings;
create trigger trg_quote_print_settings_updated_at
before update on public.quote_print_settings
for each row execute function public.set_updated_at();
