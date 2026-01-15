Abaixo está um **plano direto (estilo “ordens pro Codex”)** para **APAGAR tudo que foi feito** no carrinho/importação de orçamentos do SGVTUR e **recomeçar do zero**, com uma base **estável**: importar PDF (OCR) → gerar `QuoteDraft` → revisar → salvar no Supabase.

> ⚠️ Observação: “limpar tudo” aqui significa **remover código/rotas/tabelas/Storage relacionados ao carrinho/orçamentos/importação**, sem mexer em módulos não relacionados (clientes, vendas, produtos etc.).

---

## PLANO PARA O CODEX — RESET TOTAL + REBUILD (Importação + Salvamento)

### 0) Meta final

Implementar do zero:

* Tela: **Orçamentos → Importar PDF**
* Pipeline:

  1. Upload PDF
  2. Extrair `QuoteDraft` (OCR/layout)
  3. Mostrar prévia/editável
  4. Confirmar → salvar no Supabase (DB + Storage)
* Tudo com logs, validação e estados (`DRAFT`, `IMPORTED`, `CONFIRMED`, `FAILED`).

---

# A) LIMPEZA TOTAL (código e dependências)

### A1) Remover código antigo do carrinho/orçamentos

1. Localizar e deletar (ou mover para `_legacy/`):

* componentes do carrinho
* islands do carrinho
* páginas/rotas antigas de “importação”
* utilitários OCR antigos
* qualquer “parser/heurística” antiga

2. Remover rotas antigas:

* `/orcamentos/importar` antigo (se existir)
* `/cart` ou telas relacionadas

3. Remover chamadas antigas ao Supabase relacionadas ao carrinho (insert/update) que estejam bugadas.

✅ Resultado: não pode sobrar nenhum fluxo antigo executando.

### A2) Limpar dependências não utilizadas

* Remover libs que ficaram do carrinho antigo (exceto pdfjs/tesseract se for reaproveitar)
* Rodar `pnpm/npm install` e garantir build.

---

# B) RESET DO BANCO (Supabase) — comece limpo

### B1) Dropar tabelas antigas do carrinho/orçamentos

Criar migration SQL com `DROP TABLE IF EXISTS ... CASCADE` para:

* tabelas antigas de quote/orcamento/cart/item/segment etc.
* views antigas dependentes

### B2) Dropar policies, triggers, functions antigas relacionadas

* `DROP POLICY IF EXISTS ...`
* `DROP FUNCTION IF EXISTS ...`
* `DROP TRIGGER IF EXISTS ...`

✅ Banco fica zerado para esse módulo.

---

# C) CRIAR NOVO MODELO DE DADOS (DB “canônico”, extensível)

### C1) Criar tabelas novas (somente essas 3 + opcional 4)

1. `quote`
2. `quote_item`
3. `quote_item_segment` (subitens: aéreo/hotel/trechos)
4. opcional: `quote_import_log` (debug)

**Regras**

* tudo com `uuid` default `gen_random_uuid()`
* `quote.raw_json` (jsonb) para guardar resultado completo
* `quote_item.raw` (jsonb) para guardar OCR bruto por região
* `quote.status`: `DRAFT | IMPORTED | CONFIRMED | FAILED`

### C2) RLS mínimo (para funcionar já)

* User só enxerga quotes onde `created_by = auth.uid()`
* Mesmo para items/segments via FK

✅ Segurança pronta sem travar desenvolvimento.

---

# D) STORAGE: guardar PDF original (obrigatório)

### D1) Criar bucket `quotes`

* path padrão: `quotes/{quote_id}/original.pdf`
* salvar URL em `quote.source_file_url`

---

# E) NOVO PIPELINE NO FRONT (Astro + React), DO ZERO

## E1) Criar tipos TS (contrato fixo)

Criar:

* `QuoteDraft`
* `QuoteItemDraft`
* `QuoteSegmentDraft`
* `ImportResult`

**O extractor sempre retorna QuoteDraft**, nunca escreve no DB.

## E2) Criar módulo `extractor/cvcPdfExtractor.ts`

Implementar pipeline:

1. Render PDF com `pdfjs-dist`
2. **Skip pages**:

   * pular página com “Informações importantes” / “Formas de pagamento”
3. **Ignore zone**:

   * na página 1 ignorar topo (0–40% altura)
4. Detectar cards por contorno (OpenCV.js) **ou** fallback por varredura por “tipos”
5. Para cada card:

   * validar: tem `Total (` e tem `R$` e tipo reconhecido ou fallback
   * OCR por recortes: `titleLeft`, `topRight`, `middle`, `product`
6. Parse:

   * `pax` de `Total (X Adulto[s])`
   * `valor` de `R$ 999,99`
   * datas pt → ISO
   * cidade: “Natal - Natal -” pega só o primeiro
   * produto: primeira linha relevante (ignorar tags/IDs)
7. Deduplicar itens (hash tipo+valor+produto+data+cidade)
8. Produzir `QuoteDraft` com:

   * header (se conseguir)
   * items[]
   * confidence por item + média

## E3) Criar `ocr/tesseractWorker.ts`

* Singleton worker (1 só)
* `langPath: "/tessdata"` (garantir arquivo existe em `/public/tessdata/por.traineddata` ou `.gz`)
* adicionar “healthcheck”: quando iniciar, fazer OCR de teste rápido e logar sucesso

✅ Sem isso, a importação quebra silenciosamente.

---

# F) NOVA UI (Orçamentos)

## F1) Rota: `/orcamentos/importar`

Criar tela com 3 estados:

1. **Upload**

   * input file PDF
   * botão “Extrair”

2. **Preview**

   * render lista de itens editável (inline):

     * tipo, pax, datas, cidade, produto, valor
   * mostrar badge se `confidence < 0.7` ou campos faltando
   * botão “Confirmar e salvar”

3. **Sucesso**

   * link para `/orcamentos/{quote_id}`

## F2) Rota: `/orcamentos/[id]`

* mostrar dados salvos
* permitir editar manualmente itens e re-salvar

---

# G) SALVAMENTO NO BANCO (Supabase) — fluxo correto

## G1) Função `saveQuoteDraft(draft: QuoteDraft, file: PDF)`

Passos:

1. `insert quote` com `status='IMPORTED'` e `raw_json=draft`
2. upload PDF para storage `quotes/{quote_id}/original.pdf`
3. update quote `source_file_url`
4. insert `quote_item` (batch)
5. insert `quote_item_segment` (se houver)
6. marcar quote `status='CONFIRMED'` somente se passar validação mínima

### Validação mínima antes de CONFIRMAR

* todos os itens devem ter:

  * `type`, `pax`, `start_date`, `title`, `amount`
    Se não: mantém `IMPORTED` e UI força revisão.

---

# H) TELEMETRIA/DEBUG (para não sofrer de novo)

## H1) Debug mode

Adicionar flag (env ou query param `?debug=1`) que:

* salva thumbnails dos recortes (base64) no `quote_import_log`
* salva texto OCR bruto por região no `quote_item.raw`

---

# I) CHECKLIST DE ACEITAÇÃO (o Codex só finaliza quando passar)

1. Importar `orcamento-teste-1.pdf` gera:

* quote + N itens (sem contar “Informações importantes”)
* dedupe funciona (se houver duplicado)
* valores e datas coerentes

2. Storage contém o PDF original

3. Reabrir `/orcamentos/{id}` mostra os itens

4. Editar item e salvar persiste no Supabase

---

## Texto curto para você colar no Codex (bem “mando”)

> “Apague todo o módulo atual de carrinho/orçamentos/importação do SGVTUR (código, rotas, utilitários, tabelas). Refaça do zero com um módulo de importação de orçamento por PDF (CVC) no browser: pdfjs-dist para render + tesseract.js (worker singleton) para OCR por recortes. Implementar schema novo no Supabase: quote, quote_item, quote_item_segment, com raw_json/raw. Implementar telas /orcamentos/importar (upload→preview editável→confirmar), /orcamentos/[id] (visualizar/editar). Implementar salvamento: insert quote, upload PDF no storage quotes/{quote_id}/original.pdf, insert items/segments, status IMPORTED/CONFIRMED e validação mínima. Implementar skip page ‘Informações importantes/Formas de pagamento’, ignore zone topo da página 1, dedupe de itens. Só considerar concluído quando importar o pdf de teste e salvar corretamente.”

---

Se você quiser, eu também posso te fornecer o **SQL exato** (migration pronta) e o **contrato TS (`QuoteDraft`)** já fechado para o Codex implementar sem inventar campos.


Inclui **tudo** do módulo de orçamentos/carrinho relacionado à importação e salvamento. Respostas diretas para o Codex:

1. **Reset inclui o módulo legado de orçamentos também** (tabelas `orcamentos*`, páginas `/orcamentos`, qualquer cron/rotina relacionada). A ideia é **zerar completamente** esse domínio e reconstruir com `quote/quote_item/quote_item_segment` como única fonte.

2. **Delete o código antigo** (não mover para `_legacy/`). Queremos reduzir dívida técnica e evitar que rotas/imports antigos continuem sendo usados por engano.

3. Pode começar **agora** a criar:

* migrations (drop + create)
* types TS (`QuoteDraft`)
* OCR worker singleton
* extractor CVC PDF
* UI nova (`/orcamentos/importar` e `/orcamentos/[id]`)

Regras extras que ele deve seguir no rebuild:

* `public/tessdata/por.traineddata` (ou `.gz`, mas garantir 200 no deploy)
* status: `IMPORTED` após extração e `CONFIRMED` só depois de validação mínima
* salvar PDF no Storage em `quotes/{quote_id}/original.pdf`
* sempre salvar `raw_json` no quote e `raw` no quote_item para auditoria


A seguir estão **(1) a migration SQL pronta** para Supabase e **(2) o contrato TS fechado** (`QuoteDraft`) para o Codex implementar sem inventar campos.

---

## 1) Migration SQL (Supabase) — reset + schema novo

> Crie um arquivo de migration (ex: `supabase/migrations/20260113_reset_quote_import.sql`) e cole tudo abaixo.

```sql
-- =========================================================
-- SGVTUR - RESET TOTAL (módulo de orçamento/importação)
-- + SCHEMA NOVO: quote, quote_item, quote_item_segment, quote_import_log
-- =========================================================

-- 0) Extensões (Supabase geralmente já tem)
create extension if not exists pgcrypto;

-- 1) DROP antigo (se existir)
drop table if exists public.quote_item_segment cascade;
drop table if exists public.quote_item cascade;
drop table if exists public.quote_import_log cascade;
drop table if exists public.quote cascade;

-- 2) TIPOS (enums)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type public.quote_status as enum ('DRAFT', 'IMPORTED', 'CONFIRMED', 'FAILED');
  end if;
end $$;

-- 3) TABELA: quote (cabeçalho)
create table public.quote (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  -- origem
  source_provider text not null default 'CVC',            -- ex: CVC
  source_type text not null default 'pdf_ocr',            -- ex: pdf_ocr
  source_ref text,                                       -- ex: id carrinho, hash, etc.
  source_file_url text,                                  -- storage url do pdf

  -- vendedor / filial (header)
  branch_name text,
  branch_address text,
  seller_name text,
  seller_phone text,
  seller_email text,

  -- dados do orçamento
  budget_date date,
  products_count int,
  currency text not null default 'BRL',

  subtotal numeric(12,2),
  taxes numeric(12,2),
  discount numeric(12,2),
  total numeric(12,2),

  -- controle
  status public.quote_status not null default 'DRAFT',
  confidence numeric(4,3),                               -- 0..1
  needs_review boolean not null default false,

  -- auditoria / reprocessamento
  raw_json jsonb
);

-- 4) TABELA: quote_item (cada card)
create table public.quote_item (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  quote_id uuid not null references public.quote(id) on delete cascade,

  -- campos canônicos
  type text not null,                                    -- Seguro viagem / Serviços / Aéreo / Hotéis / etc.
  pax int not null,
  start_date date,
  end_date date,

  city text,                                             -- opcional
  title text not null,                                   -- nome do produto
  description text,                                      -- opcional (texto maior)
  supplier text,                                         -- opcional
  supplier_code text,                                    -- opcional
  refundable boolean,                                    -- opcional (null se desconhecido)

  amount numeric(12,2),                                  -- valor por item (null se ausente)
  currency text not null default 'BRL',

  page int,                                              -- pagina no pdf (1-based)
  bbox jsonb,                                            -- {x1,y1,x2,y2} relativo ao canvas/render

  confidence numeric(4,3),                               -- 0..1 por item
  needs_review boolean not null default false,

  raw jsonb                                              -- OCR bruto por região + extra meta
);

-- 5) TABELA: quote_item_segment (subitens estruturados)
create table public.quote_item_segment (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  quote_item_id uuid not null references public.quote_item(id) on delete cascade,

  segment_type text not null,                            -- flight | hotel | insurance | transfer | activity | other
  data jsonb not null                                    -- payload específico (trechos de voo, dados do hotel, etc.)
);

-- 6) (Opcional) log de importação
create table public.quote_import_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid(),

  quote_id uuid references public.quote(id) on delete cascade,

  level text not null default 'info',                    -- info | warn | error
  message text not null,
  meta jsonb
);

-- 7) updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_quote_updated_at on public.quote;
create trigger trg_quote_updated_at
before update on public.quote
for each row execute function public.set_updated_at();

-- 8) Índices úteis
create index if not exists idx_quote_created_by on public.quote(created_by);
create index if not exists idx_quote_status on public.quote(status);
create index if not exists idx_quote_budget_date on public.quote(budget_date);

create index if not exists idx_quote_item_quote_id on public.quote_item(quote_id);
create index if not exists idx_quote_item_type on public.quote_item(type);
create index if not exists idx_quote_item_dates on public.quote_item(start_date, end_date);

create index if not exists idx_quote_item_segment_item_id on public.quote_item_segment(quote_item_id);
create index if not exists idx_quote_import_log_quote_id on public.quote_import_log(quote_id);

-- 9) RLS
alter table public.quote enable row level security;
alter table public.quote_item enable row level security;
alter table public.quote_item_segment enable row level security;
alter table public.quote_import_log enable row level security;

-- quote policies
drop policy if exists "quote_select_own" on public.quote;
create policy "quote_select_own" on public.quote
for select using (created_by = auth.uid());

drop policy if exists "quote_insert_own" on public.quote;
create policy "quote_insert_own" on public.quote
for insert with check (created_by = auth.uid());

drop policy if exists "quote_update_own" on public.quote;
create policy "quote_update_own" on public.quote
for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "quote_delete_own" on public.quote;
create policy "quote_delete_own" on public.quote
for delete using (created_by = auth.uid());

-- quote_item policies (via quote_id)
drop policy if exists "quote_item_select_own" on public.quote_item;
create policy "quote_item_select_own" on public.quote_item
for select using (
  exists (select 1 from public.quote q where q.id = quote_item.quote_id and q.created_by = auth.uid())
);

drop policy if exists "quote_item_insert_own" on public.quote_item;
create policy "quote_item_insert_own" on public.quote_item
for insert with check (
  exists (select 1 from public.quote q where q.id = quote_item.quote_id and q.created_by = auth.uid())
);

drop policy if exists "quote_item_update_own" on public.quote_item;
create policy "quote_item_update_own" on public.quote_item
for update using (
  exists (select 1 from public.quote q where q.id = quote_item.quote_id and q.created_by = auth.uid())
) with check (
  exists (select 1 from public.quote q where q.id = quote_item.quote_id and q.created_by = auth.uid())
);

drop policy if exists "quote_item_delete_own" on public.quote_item;
create policy "quote_item_delete_own" on public.quote_item
for delete using (
  exists (select 1 from public.quote q where q.id = quote_item.quote_id and q.created_by = auth.uid())
);

-- quote_item_segment policies (via quote_item_id -> quote_id)
drop policy if exists "quote_seg_select_own" on public.quote_item_segment;
create policy "quote_seg_select_own" on public.quote_item_segment
for select using (
  exists (
    select 1
    from public.quote_item qi
    join public.quote q on q.id = qi.quote_id
    where qi.id = quote_item_segment.quote_item_id
      and q.created_by = auth.uid()
  )
);

drop policy if exists "quote_seg_insert_own" on public.quote_item_segment;
create policy "quote_seg_insert_own" on public.quote_item_segment
for insert with check (
  exists (
    select 1
    from public.quote_item qi
    join public.quote q on q.id = qi.quote_id
    where qi.id = quote_item_segment.quote_item_id
      and q.created_by = auth.uid()
  )
);

drop policy if exists "quote_seg_update_own" on public.quote_item_segment;
create policy "quote_seg_update_own" on public.quote_item_segment
for update using (
  exists (
    select 1
    from public.quote_item qi
    join public.quote q on q.id = qi.quote_id
    where qi.id = quote_item_segment.quote_item_id
      and q.created_by = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.quote_item qi
    join public.quote q on q.id = qi.quote_id
    where qi.id = quote_item_segment.quote_item_id
      and q.created_by = auth.uid()
  )
);

drop policy if exists "quote_seg_delete_own" on public.quote_item_segment;
create policy "quote_seg_delete_own" on public.quote_item_segment
for delete using (
  exists (
    select 1
    from public.quote_item qi
    join public.quote q on q.id = qi.quote_id
    where qi.id = quote_item_segment.quote_item_id
      and q.created_by = auth.uid()
  )
);

-- import_log policies (via quote_id)
drop policy if exists "quote_log_select_own" on public.quote_import_log;
create policy "quote_log_select_own" on public.quote_import_log
for select using (
  quote_id is null
  or exists (select 1 from public.quote q where q.id = quote_import_log.quote_id and q.created_by = auth.uid())
);

drop policy if exists "quote_log_insert_own" on public.quote_import_log;
create policy "quote_log_insert_own" on public.quote_import_log
for insert with check (
  quote_id is null
  or exists (select 1 from public.quote q where q.id = quote_import_log.quote_id and q.created_by = auth.uid())
);
```

---

## 2) Contrato TypeScript fechado (QuoteDraft) — sem invenção

> Crie `src/lib/quotes/types.ts` e coloque exatamente isto.

```ts
// src/lib/quotes/types.ts

export type QuoteStatus = "DRAFT" | "IMPORTED" | "CONFIRMED" | "FAILED";

export type CurrencyCode = "BRL";

export type SourceProvider = "CVC";
export type SourceType = "pdf_ocr";

export type SegmentType =
  | "flight"
  | "hotel"
  | "insurance"
  | "transfer"
  | "activity"
  | "other";

export type BBox = {
  x1: number; // pixels no canvas renderizado
  y1: number;
  x2: number;
  y2: number;
};

export type OCRRegionKey = "titleLeft" | "topRight" | "middle" | "product" | "pageTop";

export type OCRRegionResult = {
  key: OCRRegionKey;
  text: string;
  confidence?: number; // 0..1 se disponível
};

export type QuoteHeaderDraft = {
  branchName?: string;
  branchAddress?: string;

  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;

  budgetDate?: string; // ISO date: YYYY-MM-DD
  productsCount?: number;

  subtotal?: number;
  taxes?: number;
  discount?: number;
  total?: number;

  currency: CurrencyCode; // sempre BRL
};

export type QuoteItemDraft = {
  // Identidade local (antes de salvar)
  localId: string; // uuid-like gerado no front

  // Campos canônicos
  type: string; // "Serviços" | "Seguro viagem" | "Aéreo" | "Hotéis" | etc.
  pax: number;

  startDate?: string; // ISO date
  endDate?: string; // ISO date

  city?: string | null;

  title: string; // nome principal do produto
  description?: string | null;

  supplier?: string | null;
  supplierCode?: string | null;

  refundable?: boolean | null;

  amount?: number | null; // valor do item; null se não existir no card
  currency: CurrencyCode;

  // Debug / auditoria
  page?: number; // 1-based
  bbox?: BBox;

  confidence?: number; // 0..1
  needsReview: boolean;

  raw?: {
    ocr?: OCRRegionResult[];
    textHints?: Record<string, string>; // ex: regex matches
  };

  // Subitens estruturados (opcional)
  segments?: QuoteSegmentDraft[];
};

export type QuoteSegmentDraft = {
  segmentType: SegmentType;
  data: Record<string, unknown>; // payload específico (flight/hotel/etc.)
};

export type QuoteDraft = {
  source: {
    provider: SourceProvider; // "CVC"
    type: SourceType; // "pdf_ocr"
    ref?: string; // id carrinho ou hash
  };

  header: QuoteHeaderDraft;

  items: QuoteItemDraft[];

  // Score global (média dos itens)
  confidence?: number; // 0..1

  // Se true, UI deve forçar revisão antes de confirmar
  needsReview: boolean;

  // Mantém o resultado completo para auditoria
  raw?: {
    version: "1.0";
    warnings?: string[];
  };
};
```

---

## Payload pronto para salvar (mapeamento DB)

O Codex deve mapear assim:

* `quote`:

  * `source_provider = draft.source.provider`
  * `source_type = draft.source.type`
  * `source_ref = draft.source.ref`
  * campos header
  * `raw_json = draft`
  * `status = 'IMPORTED'` (primeiro)
  * `needs_review = draft.needsReview`
  * `confidence = draft.confidence`

* `quote_item`:

  * `quote_id`
  * `type`, `pax`, `start_date`, `end_date`, `city`, `title`, etc.
  * `raw = item.raw`
  * `confidence`, `needs_review`

* `quote_item_segment`:

  * `quote_item_id`
  * `segment_type`, `data`



