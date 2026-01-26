-- Permite clientes sem CPF (fluxo de criacao rapida em orcamentos).
ALTER TABLE public.clientes
  ALTER COLUMN cpf DROP NOT NULL;
