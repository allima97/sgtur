# 🛒 Orçamentos (Carrinho) com Hotelaria + Serviços — Especificação Completa (SGTUR)

Este documento define **o padrão oficial** para o SGVTUR/SGTUR gerar **orçamentos como carrinho de compras**,
permitindo ao usuário incluir **múltiplos hotéis e múltiplos serviços** (transfer, passeio, seguro, taxas, descontos)
e gerar um orçamento formal para o cliente.

✅ Premissa: **o banco já possui as estruturas** (quote/quote_item + hotelaria + serviços + fornecedores).  
🎯 Objetivo: **alinhar e completar o fluxo na UI + regras + integração**.

---

## 0) Glossário rápido

- **Carrinho**: itens temporários do orçamento em edição.
- **Orçamento**: documento comercial final (mesmo que ainda em rascunho).
- **Snapshot**: congelamento de preço/política/fornecedor/comissão no item do orçamento.
- **Engine**:
  - `quote` + `quote_item` = engine profissional do carrinho (recomendada para hotel/serviços)
  - `orcamentos` (tabela) = engine legada/CRM simples (pode coexistir, mas o carrinho profissional usa quote)

---

## 1) Entidades e tabelas envolvidas (como o sistema deve pensar)

### 1.1 Cabeçalho do Orçamento (Quote)
Tabela: `public.quote`

Papel:
- identifica o orçamento (rascunho/enviado/revisado/aceito)
- amarra cliente e vendedor
- define moeda e validade
- guarda total consolidado

Campos principais:
- `id` (uuid)
- `inquiry_id` (opcional)
- `client_id` (obrigatório)
- `seller_id` (obrigatório)
- `status` (DRAFT/SENT/REVISED/ACCEPTED/EXPIRED/REJECTED)
- `currency`
- `valid_until`
- `total`

Regra:
- Um `quote` pode existir em `DRAFT` mesmo sem itens.

---

### 1.2 Itens do Carrinho (Quote Items)
Tabela: `public.quote_item`

Papel:
- cada item do carrinho = 1 linha do orçamento
- hotel, transfer, passeio, seguro, taxa, desconto etc.
- grava snapshots para **não recalcular** depois

Campos principais:
- `id`
- `quote_id`
- `product_id` (uuid)
- `item_type` (HOTEL/TRANSFER/TOUR/PACKAGE/FEE/DISCOUNT/INSURANCE etc.)
- `quantity`
- `description_snapshot` (texto final que será exibido no orçamento)
- `unit_price_snapshot` (preço unitário congelado)
- `taxes_snapshot` (taxas congeladas)
- `net_unit_snapshot` (opcional)
- `markup_type / markup_value / markup_amount_snapshot`
- `commission_type / commission_value / commission_amount_snapshot`
- `supplier_snapshot` (texto congelado do fornecedor)
- `policy_snapshot` (texto congelado de política)
- `total_item` (total congelado do item)

Regra:
- **Snapshots são definitivos**. Editar item = remover e inserir novo item.

---

### 1.3 Descontos do Orçamento
Tabela: `public.quote_discount`

Papel:
- registrar descontos e aprovações (quando aplicável)
- pode refletir no total e também aparecer no orçamento

Campos principais:
- `quote_id`
- `discount_type` (FIXED/PERCENT)
- `value`
- `reason`
- `approved_by` (opcional)

Regra:
- Desconto aplicado deve refletir no `quote.total`.
- Opcionalmente, pode gerar um `quote_item` do tipo `DISCOUNT` (dependendo de como você quer exibir).

---

## 2) Tipos de itens aceitos no carrinho (padrão)

Campo: `quote_item.item_type`

Recomendado (pelo seu schema atual):
- `HOTEL`
- `TRANSFER`
- `TOUR`
- `INSURANCE`
- `PACKAGE`
- `FEE`
- `DISCOUNT`

Regras gerais:
- `FEE` = taxas administrativas, emissão, etc.
- `DISCOUNT` = desconto como item (se você optar por representar assim)
- `PACKAGE` = pacote pronto (se existir)

---

## 3) Hotelaria (engine e dados)

### 3.1 Tabelas de hotelaria existentes
- `hotel` (com `product_id` único)
- `hotel_room_type`
- `rate_plan`
- `hotel_rate`
- `hotel_rate_period`
- `hotel_rate_occupancy`
- `hotel_tax_fee`
- `hotel_policy`

### 3.2 O que o usuário escolhe para inserir hotel no carrinho
Obrigatórios:
- Hotel
- Tipo de quarto
- Rate plan (regime + reembolsável)
- Check-in
- Check-out
- Adultos / Crianças
- Quantidade de quartos (se aplicável)

Opcionais:
- Observações (ex: “andar alto”, “cama casal”)
- Cupom interno (se houver)
- Moeda (ou usar `quote.currency`)

### 3.3 Cálculo do preço do hotel (antes de inserir no carrinho)
Este cálculo é **preview** e deve retornar:

- `night_count`
- `net_total` (se você usa net)
- `tax_total`
- `gross_total`
- `unit_price` (por noite, por quarto, etc — padronizar)
- breakdown (para auditoria/explicação na UI)

Fontes:
- `hotel_rate` (base)
- `hotel_rate_period` (ajustes)
- `hotel_rate_occupancy` (extras)
- `hotel_tax_fee` (taxas)
- `hotel_policy` (política a ser mostrada e congelada)

Regra:
- O cálculo NÃO grava nada, apenas retorna dados para confirmação.

### 3.4 Inserção do hotel como item do carrinho (quote_item)
Ao confirmar, criar `quote_item` com:

- `item_type = 'HOTEL'`
- `product_id = hotel.product_id` (ou um product_id específico do rate plan, se você tiver)
- `quantity = night_count * rooms` (padronizar para permitir soma coerente)
- `description_snapshot`:
  - "Hotel X — Quarto Y — Regime Z — 10/01 a 15/01 (5 noites) — 2 adultos"
- `unit_price_snapshot`:
  - preço base por unidade (definir unidade como: “por noite/quarto”)
- `taxes_snapshot`:
  - total de taxas do item (já calculado)
- `policy_snapshot`:
  - texto consolidado da política de cancelamento/no-show
- `supplier_snapshot`:
  - nome do hotel e dados relevantes (ou fornecedor real, se houver link)
- `total_item`:
  - total final do item (gross total)

Opcional:
- `markup_*` (se o orçamento calcula margem no carrinho)
- `commission_*` (se comissão é calculada no carrinho)

Regra:
- Depois que o item entrou, ele não deve ser recalculado automaticamente.

---

## 4) Serviços (transfer/passeio/seguro) — engine e dados

### 4.1 Tabelas de serviços existentes
- `servicos`
- `servicos_fornecedor`
- `servico_fornecedor_price`
- `servico_fornecedor_price_period`
- (opcional) `servico_price` / `servico_price_period` (se existir preço sem fornecedor)

### 4.2 O que o usuário escolhe para inserir serviço no carrinho
Obrigatórios:
- Tipo do item (`TRANSFER`, `TOUR`, `INSURANCE`, etc.)
- Fornecedor (quando for serviço por fornecedor)
- Serviço específico do fornecedor
- Quantidade (pax/reserva/dia)
- Data(s) (quando aplicável)

Opcionais:
- Local de saída/chegada
- Horário
- Observações (ex: cadeira bebê, bagagens, etc.)

### 4.3 Cálculo do preço do serviço (preview)
O cálculo deve retornar:
- `unit_price`
- `total`
- `currency`
- `breakdown` (per pax/per reserva/per dia)
- regras/ajustes de período (price_period)

### 4.4 Inserção do serviço como item do carrinho (quote_item)
Ao confirmar, criar `quote_item` com:

- `item_type = 'TRANSFER' | 'TOUR' | 'INSURANCE'`
- `product_id`:
  - preferencialmente um `product_id` de catálogo (se existir)
  - ou usar um produto genérico (ex: “Serviço Transfer”) e detalhar tudo no snapshot
- `quantity`:
  - pax/reserva/dias conforme tipo_valor
- `description_snapshot`:
  - "Transfer In — Aeroporto → Hotel — 2 pax — 10/01 — 18:30"
- `supplier_snapshot`:
  - nome do fornecedor + contato (se útil)
- `unit_price_snapshot`, `total_item`
- `taxes_snapshot` (se tiver taxas)
- `policy_snapshot` (se existir política específica)

---

## 5) Carrinho: fluxo completo na UI (o que precisa existir)

### 5.1 Tela principal: Orçamento (Carrinho)
Rota sugerida:
- `/orcamentos/novo` (cria quote)
- `/orcamentos/:id` (edita/visualiza quote)

Componentes:
1) Cabeçalho do orçamento:
- cliente (seleção/autocomplete)
- vendedor (auto pelo usuário logado)
- validade
- moeda
- status

2) Carrinho (lista de itens):
- tabela com itens do quote_item
- totalizadores
- ações: editar/remover

3) Ações do carrinho:
- **Adicionar Hotel**
- **Adicionar Serviço**
- **Adicionar Taxa**
- **Aplicar Desconto**
- **Gerar PDF**
- **Enviar (WhatsApp/E-mail)**
- **Converter em Venda** (quando aceitar)

### 5.2 Modal/fluxo “Adicionar Hotel”
Etapas:
1) escolher hotel
2) escolher quarto
3) escolher rate plan
4) informar datas e pax
5) preview de valores + política
6) confirmar → cria quote_item

### 5.3 Modal/fluxo “Adicionar Serviço”
Etapas:
1) escolher tipo (transfer/passeio/seguro)
2) escolher fornecedor
3) escolher serviço do fornecedor
4) datas/quantidade/detalhes
5) preview
6) confirmar → cria quote_item

### 5.4 Modal/fluxo “Aplicar desconto”
- cria `quote_discount`
- recalcula total do quote
- (opcional) cria item DISCOUNT para exibição na lista

---

## 6) Regras de totalização e consistência

### 6.1 Total do quote
`quote.total` deve ser atualizado por:
- soma de `quote_item.total_item`
- menos descontos (se `quote_discount` não virar item)
- ou incluindo o item `DISCOUNT` (se você representar descontos como item)

Recomendação:
- **Escolha 1 estratégia só** para não duplicar:
  - Estratégia A: desconto só em `quote_discount` (não cria item DISCOUNT)
  - Estratégia B: desconto vira item `quote_item` (tipo DISCOUNT, total_item negativo)

### 6.2 Regras anti-bug
- Não permitir `quote_item` com `total_item` nulo
- Não permitir `quote_item` sem `description_snapshot`
- Não permitir `quote_item` sem `item_type`

### 6.3 Editar item
Editar = remover item antigo + inserir item novo (novo snapshot).

---

## 7) Comissão / Markup (como o carrinho deve se comportar)

Você já tem:
- `pricing_rule` (markup + comissão por canal/destino/item)
- `commission_rule` / `product_commission_rule`
- `commission_ledger` (pós-venda)

No carrinho:
- **opção recomendada**: calcular e salvar snapshots:
  - `markup_type`, `markup_value`, `markup_amount_snapshot`
  - `commission_type`, `commission_value`, `commission_amount_snapshot`

Regras:
- snapshot garante que o orçamento não muda quando regras mudarem
- ledger definitivo pode ser gerado apenas na venda

---

## 8) Conversão: Orçamento → Venda → Viagem (para depois)

### 8.1 Quote → Sale
- criar `sale` com `quote_id`
- copiar totals
- criar `sale_item` para cada `quote_item`

### 8.2 Sale → Viagem
- criar `viagens` vinculada ao `sale` (ou ao seu `vendas`)
- criar `viagem_servicos` a partir de `sale_item`

⚠️ Importante:
- nada recalcula; apenas copia snapshots

---

## 9) Permissões e segurança (mínimo necessário)

Regras por módulo:
- Vendedor cria/edita seus quotes em DRAFT
- Gestor pode ver equipe
- Admin tudo

Checklist:
- RLS: quote/quote_item por `seller_id` e/ou `company_id` (dependendo do seu tenancy)
- Logs: registrar eventos:
  - `quote_criado`, `quote_item_adicionado`, `quote_item_removido`, `quote_enviado`, `quote_convertido`

---

## 10) Checklist de implementação (backlog objetivo)

### 10.1 Backend (supabase queries/serviços)
- [ ] CRUD `quote` (create draft / update header / change status)
- [ ] CRUD `quote_item` (insert / list / delete)
- [ ] serviço de cálculo de hotel (preview)
- [ ] serviço de cálculo de serviço (preview)
- [ ] totalizador do quote (trigger ou função ou no app)

### 10.2 UI
- [ ] Tela quote/carrinho com lista de itens + total
- [ ] Modal “Adicionar Hotel”
- [ ] Modal “Adicionar Serviço”
- [ ] Remover item
- [ ] Aplicar desconto
- [ ] Enviar orçamento (link + PDF)
- [ ] Converter para venda (futuro próximo)

### 10.3 Qualidade / UX
- [ ] Carrinho deve ser rápido e claro
- [ ] Mensagens de erro amigáveis
- [ ] Loader/Skeleton nos modais de cálculo
- [ ] Garantir que o usuário consiga montar um orçamento em < 2 minutos

---

## 11) Padrões de snapshot (texto que deve ser salvo)

### 11.1 Exemplo snapshot hotel (description_snapshot)
"Hotel Copacabana Palace — Quarto Deluxe — Café da manhã — 10/01/2026 a 15/01/2026 (5 noites) — 2 adultos"

### 11.2 Exemplo snapshot serviço transfer
"Transfer IN — GIG → Copacabana Palace — 2 pax — 10/01/2026 — 18:30 — bagagem: 2 malas"

### 11.3 Exemplo policy_snapshot hotel
"Cancelamento grátis até 7 dias antes. Após esse prazo: 1ª noite. No-show: 100% da reserva."

---

## 12) Decisão técnica importante (para alinhar com o que já existe)

✅ Para carrinho profissional, usar:
- `quote` + `quote_item`

⚠️ O módulo legado `orcamentos` pode permanecer:
- como CRM simples
- ou como “atalho” que cria um `quote` por baixo

Recomendação para alinhar sem quebrar:
- **tela atual /orcamentos** continua existindo,
- mas o botão "Montar orçamento (carrinho)" cria/abre um `quote`.

---

## 13) Resultado esperado (critério de pronto)

Um usuário consegue:
1) Criar um orçamento
2) Adicionar 1 hotel + 2 serviços
3) Ver total e descontos
4) Gerar PDF/Link
5) Enviar ao cliente
6) Reabrir depois e continuar
7) Converter em venda (etapa seguinte)

Sem recalcular itens já adicionados.

---

📌 Este documento é o padrão oficial para o **Carrinho de Orçamentos com Hotelaria e Serviços** no SGTUR.
