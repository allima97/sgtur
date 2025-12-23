Dossiê da Viagem
-- 2024-07-24: cascade deletions so orçamentos and viagens clean up consistently.

alter table if exists public.viagens
  drop constraint if exists viagens_orcamento_id_fkey;
alter table if exists public.viagens
  add constraint viagens_orcamento_id_fkey
  foreign key (orcamento_id)
  references public.orcamentos(id)
  on delete cascade;

alter table if exists public.orcamento_interacoes
  drop constraint if exists orcamento_interacoes_orcamento_id_fkey;
alter table if exists public.orcamento_interacoes
  add constraint orcamento_interacoes_orcamento_id_fkey
  foreign key (orcamento_id)
  references public.orcamentos(id)
  on delete cascade;
