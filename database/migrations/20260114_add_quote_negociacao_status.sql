-- 2026-01-14: add status_negociacao to quote for commercial follow-up.

alter table public.quote
  add column if not exists status_negociacao text;

update public.quote
set status_negociacao = 'Enviado'
where status_negociacao is null;

alter table public.quote
  alter column status_negociacao set default 'Enviado',
  alter column status_negociacao set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quote_status_negociacao_check'
  ) then
    alter table public.quote
      add constraint quote_status_negociacao_check
      check (status_negociacao in ('Enviado', 'Negociando', 'Fechado', 'Perdido'));
  end if;
end $$;
