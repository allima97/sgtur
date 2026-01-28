-- 2026-02-11: allow anonymous login logs while keeping auth-bound audit integrity.

alter table public.logs
  alter column user_id drop not null;

drop policy if exists "logs_insert" on public.logs;
create policy "logs_insert" on public.logs
  for insert with check (
    (
      auth.uid() IS NOT NULL
      and user_id = auth.uid()
    )
    or (
      auth.uid() IS NULL
      and user_id IS NULL
      and modulo = 'login'
      and acao in (
        'tentativa_login',
        'login_falhou',
        'login_erro_interno',
        'solicitou_recuperacao_senha',
        'reset_link_invalido'
      )
    )
  );
