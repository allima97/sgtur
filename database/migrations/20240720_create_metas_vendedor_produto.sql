-- Migration: Garantir a existência de metas_vendedor_produto
-- Referência: public/sgtur-plano-modulos.md (secção 3.3)

CREATE TABLE IF NOT EXISTS public.metas_vendedor_produto (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meta_vendedor_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT metas_vendedor_produto_pkey PRIMARY KEY (id),
  CONSTRAINT metas_vendedor_produto_meta_vendedor_id_fkey FOREIGN KEY (meta_vendedor_id)
    REFERENCES public.metas_vendedor(id) ON DELETE CASCADE,
  CONSTRAINT metas_vendedor_produto_produto_id_fkey FOREIGN KEY (produto_id)
    REFERENCES public.tipo_produtos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS metas_vendedor_produto_meta_idx
  ON public.metas_vendedor_produto (meta_vendedor_id);

CREATE INDEX IF NOT EXISTS metas_vendedor_produto_produto_idx
  ON public.metas_vendedor_produto (produto_id);
