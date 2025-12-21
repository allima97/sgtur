ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS destino_cidade_id uuid REFERENCES public.cidades(id);

UPDATE public.vendas v
SET destino_cidade_id = p.cidade_id
FROM public.produtos p
WHERE v.destino_id = p.id
  AND v.destino_cidade_id IS NULL
  AND p.cidade_id IS NOT NULL;
