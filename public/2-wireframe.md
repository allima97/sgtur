# 🧩 Orçamentos (Carrinho) — Wireframe, Contratos de Funções e Queries (SGTUR)

Este documento complementa a especificação funcional do carrinho de orçamentos,
detalhando **layout das telas**, **fluxos de UI**, **contratos de funções** e
**queries Supabase** necessárias para implementar hotelaria e serviços no orçamento.

Premissa:
- O banco já está pronto
- O motor de orçamento é `quote` + `quote_item`
- Hotel e serviços entram como itens do carrinho
- Nada é recalculado após inserção (snapshot)

---

## 1️⃣ Wireframe Textual — Tela Principal do Carrinho

### 📍 Rota
/orcamentos/carrinho/:quote_id

yaml
Copiar código

---

### 🧱 Estrutura Visual (alto nível)

┌────────────────────────────────────────────┐
│ Cabeçalho do Orçamento │
│ Cliente | Vendedor | Moeda | Validade │
│ Status: DRAFT | Total: R$ 12.350,00 │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Itens do Carrinho │
│ ┌────────────────────────────────────────┐ │
│ │ HOTEL - Copacabana Palace │ │
│ │ 10/01 → 15/01 | 5 noites | 2 adultos │ │
│ │ Total: R$ 7.500,00 │ │
│ │ [Remover] │ │
│ └────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────┐ │
│ │ TRANSFER IN - GIG → Hotel │ │
│ │ 2 pax | 10/01 | 18:30 │ │
│ │ Total: R$ 350,00 │ │
│ │ [Remover] │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Ações do Carrinho │
│ [+ Hotel] [+ Serviço] [+ Taxa] │
│ [Aplicar Desconto] │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Totalização │
│ Subtotal: R$ 7.850,00 │
│ Descontos: -R$ 500,00 │
│ TOTAL: R$ 7.350,00 │
│ │
│ [Gerar PDF] [Enviar] [Converter em Venda] │
└────────────────────────────────────────────┘

yaml
Copiar código

---

## 2️⃣ Wireframe — Modal “Adicionar Hotel”

### Fluxo visual

[ Selecionar Hotel ]
[ Tipo de Quarto ]
[ Regime / Reembolsável ]

Check-in | Check-out
Adultos | Crianças | Quartos

────────────────────────
PREVIEW DO CÁLCULO

Valor base

Taxas

Total

Política
────────────────────────

[Cancelar] [Adicionar ao Carrinho]

yaml
Copiar código

---

## 3️⃣ Wireframe — Modal “Adicionar Serviço”

Tipo de Serviço (Transfer / Passeio / Seguro)
Fornecedor
Serviço do Fornecedor

Quantidade / Datas / Horário

────────────────────────
PREVIEW

Valor unitário

Total
────────────────────────

[Cancelar] [Adicionar ao Carrinho]

yaml
Copiar código

---

## 4️⃣ Contratos de Funções (Frontend / Backend)

### 4.1 Criar Orçamento (Quote)

```ts
createQuote(input: {
  client_id: string
  seller_id: string
  currency: string
  valid_until: string
}): Promise<Quote>
4.2 Listar Itens do Carrinho
ts
Copiar código
listQuoteItems(quote_id: string): Promise<QuoteItem[]>
4.3 Preview de Hotel (NÃO grava)
ts
Copiar código
getHotelQuotePreview(input: {
  hotel_id: string
  room_type_id: string
  rate_plan_id: string
  checkin: string
  checkout: string
  adults: number
  children: number
  rooms: number
}): Promise<{
  night_count: number
  unit_price: number
  tax_total: number
  gross_total: number
  policy_text: string
  breakdown: any
}>
4.4 Inserir Hotel no Carrinho
ts
Copiar código
addHotelToQuote(input: {
  quote_id: string
  hotel_product_id: string
  description_snapshot: string
  policy_snapshot: string
  supplier_snapshot: string
  quantity: number
  unit_price_snapshot: number
  taxes_snapshot: number
  total_item: number
  commission_snapshot?: {
    type: 'FIXED' | 'PERCENT'
    value: number
    amount: number
  }
}): Promise<QuoteItem>
4.5 Preview de Serviço
ts
Copiar código
getServiceQuotePreview(input: {
  servico_fornecedor_id: string
  data_inicio?: string
  data_fim?: string
  quantity: number
}): Promise<{
  unit_price: number
  total: number
  currency: string
}>
4.6 Inserir Serviço no Carrinho
ts
Copiar código
addServiceToQuote(input: {
  quote_id: string
  product_id: string
  item_type: 'TRANSFER' | 'TOUR' | 'INSURANCE'
  description_snapshot: string
  supplier_snapshot: string
  quantity: number
  unit_price_snapshot: number
  total_item: number
}): Promise<QuoteItem>
4.7 Remover Item do Carrinho
ts
Copiar código
removeQuoteItem(quote_item_id: string): Promise<void>
4.8 Aplicar Desconto
ts
Copiar código
applyQuoteDiscount(input: {
  quote_id: string
  discount_type: 'FIXED' | 'PERCENT'
  value: number
  reason?: string
}): Promise<void>
5️⃣ Queries Supabase — Exemplos
5.1 Criar Quote
ts
Copiar código
supabase.from('quote').insert({
  client_id,
  seller_id,
  currency,
  valid_until,
  status: 'DRAFT'
}).select().single()
5.2 Listar Itens do Carrinho
ts
Copiar código
supabase
  .from('quote_item')
  .select('*')
  .eq('quote_id', quote_id)
  .order('created_at')
5.3 Inserir Item (Hotel ou Serviço)
ts
Copiar código
supabase.from('quote_item').insert({
  quote_id,
  product_id,
  item_type,
  quantity,
  description_snapshot,
  unit_price_snapshot,
  taxes_snapshot,
  total_item,
  supplier_snapshot,
  policy_snapshot,
  commission_type,
  commission_value,
  commission_amount_snapshot
})
5.4 Atualizar Total do Quote
ts
Copiar código
const { data: items } = await supabase
  .from('quote_item')
  .select('total_item')
  .eq('quote_id', quote_id)

const total = items.reduce((sum, i) => sum + Number(i.total_item), 0)

await supabase
  .from('quote')
  .update({ total })
  .eq('id', quote_id)
6️⃣ Regras Importantes de UX / Técnica
Carrinho sempre visível

Preview sempre antes de inserir

Inseriu → congelou

Editar = remover + inserir

Totais sempre recalculados a partir dos snapshots

Nunca recalcular automaticamente um item já inserido

7️⃣ Checklist Final de Implementação
Backend
 Preview hotel

 Preview serviço

 Insert quote_item

 Totalizador do quote

Frontend
 Tela carrinho

 Modal hotel

 Modal serviço

 Remover item

 Aplicar desconto

Integração futura
 Quote → Sale

 Sale → Viagem

📌 Este documento complementa a especificação funcional do carrinho e serve como guia direto para implementação no SGTUR.

yaml
Copiar código

---

## Próximo passo natural (se quiser continuar)

Agora dá para ir **100% mão na massa**. Posso:

1. 🧩 Gerar **componentes Astro/React** (Carrinho + Modais)  
2. 🧠 Criar **serviços TS reais** (preview hotel / preview serviço)  
3. 🧪 Montar **exemplos reais de dados**  
4. 🔁 Desenhar **Quote → Sale → Viagem** no mesmo nível de detalhe  