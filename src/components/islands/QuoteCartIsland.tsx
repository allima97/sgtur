import React, { useMemo, useState } from "react";
import AddHotelModal from "./quote/AddHotelModal";
import AddServiceModal from "./quote/AddServiceModal";
import DiscountModal from "./quote/DiscountModal";
import { supabaseBrowser } from "../../lib/supabase-browser";

type Quote = {
  id: string;
  client_id: string;
  seller_id: string;
  status: string;
  currency: string;
  valid_until: string;
  total: number;
};

type QuoteItem = {
  id: string;
  quote_id: string;
  product_id: string;
  item_type: string;
  quantity: number;
  description_snapshot: string;
  unit_price_snapshot: number;
  taxes_snapshot: number;
  total_item: number;
  supplier_snapshot?: string | null;
  policy_snapshot?: string | null;
  commission_type?: string | null;
  commission_value?: number | null;
  commission_amount_snapshot?: number | null;
  created_at?: string;
};

type QuoteDiscount = {
  id: string;
  quote_id: string;
  discount_type: "FIXED" | "PERCENT";
  value: number;
  reason?: string | null;
  created_at?: string;
};

export default function QuoteCartIsland(props: {
  initialQuote: Quote;
  initialItems: QuoteItem[];
  initialDiscounts: QuoteDiscount[];
  userId: string;
}) {
  const [quote, setQuote] = useState<Quote>(props.initialQuote);
  const [items, setItems] = useState<QuoteItem[]>(props.initialItems);
  const [discounts, setDiscounts] = useState<QuoteDiscount[]>(
    props.initialDiscounts
  );

  const [openHotel, setOpenHotel] = useState(false);
  const [openService, setOpenService] = useState(false);
  const [openDiscount, setOpenDiscount] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.total_item || 0), 0),
    [items]
  );

  const discountTotal = useMemo(() => {
    // estratégia: descontos ficam em quote_discount e são subtraídos do subtotal
    return discounts.reduce((sum, d) => {
      const v = Number(d.value || 0);
      if (d.discount_type === "FIXED") return sum + v;
      // percent sobre subtotal atual (simples)
      return sum + (subtotal * v) / 100;
    }, 0);
  }, [discounts, subtotal]);

  const total = useMemo(() => Math.max(0, subtotal - discountTotal), [subtotal, discountTotal]);

  async function refresh() {
    setBusy("Atualizando...");
    try {
      const { data: newQuote } = await supabaseBrowser
        .from("quote")
        .select("id, client_id, seller_id, status, currency, valid_until, total")
        .eq("id", quote.id)
        .single();

      const { data: newItems } = await supabaseBrowser
        .from("quote_item")
        .select("*")
        .eq("quote_id", quote.id)
        .order("created_at", { ascending: true });

      const { data: newDiscounts } = await supabaseBrowser
        .from("quote_discount")
        .select("*")
        .eq("quote_id", quote.id)
        .order("created_at", { ascending: true });

      if (newQuote) setQuote(newQuote as Quote);
      setItems((newItems ?? []) as QuoteItem[]);
      setDiscounts((newDiscounts ?? []) as QuoteDiscount[]);
    } finally {
      setBusy(null);
    }
  }

  async function recalcAndPersistTotal() {
    // Persiste quote.total com o total atual (snapshot + descontos)
    setBusy("Calculando total...");
    try {
      const { error } = await supabaseBrowser
        .from("quote")
        .update({ total })
        .eq("id", quote.id);
      if (error) throw error;
      setQuote((q) => ({ ...q, total }));
    } finally {
      setBusy(null);
    }
  }

  async function removeItem(itemId: string) {
    if (!confirm("Remover este item do carrinho?")) return;
    setBusy("Removendo item...");
    try {
      const { error } = await supabaseBrowser.from("quote_item").delete().eq("id", itemId);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-base">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-sm text-muted">Status</div>
            <div className="font-semibold">{quote.status}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Moeda</div>
            <div className="font-semibold">{quote.currency}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Validade</div>
            <div className="font-semibold">{quote.valid_until}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">Total (persistido)</div>
            <div className="text-xl font-bold">
              {Number(quote.total || 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: quote.currency || "BRL",
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setOpenHotel(true)}>
            + Hotel
          </button>
          <button className="btn-secondary" onClick={() => setOpenService(true)}>
            + Serviço
          </button>
          <button className="btn-light" onClick={() => setOpenDiscount(true)}>
            Aplicar desconto
          </button>
          <button className="btn-light" onClick={refresh}>
            Atualizar
          </button>
          <button className="btn-primary" onClick={recalcAndPersistTotal}>
            Recalcular total
          </button>
        </div>

        {busy && (
          <div className="mt-3 card-warn">
            <strong>{busy}</strong>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card-base">
        <h2 className="card-title">Itens do carrinho</h2>

        {items.length === 0 ? (
          <div className="text-muted">Nenhum item ainda. Adicione Hotel ou Serviço.</div>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead className="table-header-blue">
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Qtd</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="font-semibold">{it.item_type}</td>
                    <td>
                      <div className="font-medium">{it.description_snapshot}</div>
                      {(it.supplier_snapshot || it.policy_snapshot) && (
                        <div className="text-xs text-muted mt-1">
                          {it.supplier_snapshot ? `Fornecedor: ${it.supplier_snapshot}` : ""}
                          {it.policy_snapshot ? ` • Política: ${it.policy_snapshot}` : ""}
                        </div>
                      )}
                    </td>
                    <td>{it.quantity}</td>
                    <td className="font-semibold">
                      {Number(it.total_item || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: quote.currency || "BRL",
                      })}
                    </td>
                    <td className="text-right">
                      <button className="btn-danger" onClick={() => removeItem(it.id)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="card-base">
        <h2 className="card-title">Totalização</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card-subtle">
            <div className="text-sm text-muted">Subtotal</div>
            <div className="text-lg font-bold">
              {subtotal.toLocaleString("pt-BR", { style: "currency", currency: quote.currency || "BRL" })}
            </div>
          </div>

          <div className="card-subtle">
            <div className="text-sm text-muted">Descontos (estimado)</div>
            <div className="text-lg font-bold">
              {discountTotal.toLocaleString("pt-BR", { style: "currency", currency: quote.currency || "BRL" })}
            </div>
          </div>

          <div className="card-subtle">
            <div className="text-sm text-muted">Total (calculado)</div>
            <div className="text-xl font-bold">
              {total.toLocaleString("pt-BR", { style: "currency", currency: quote.currency || "BRL" })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {openHotel && (
        <AddHotelModal
          quoteId={quote.id}
          currency={quote.currency || "BRL"}
          onClose={() => setOpenHotel(false)}
          onAdded={async () => {
            setOpenHotel(false);
            await refresh();
          }}
        />
      )}

      {openService && (
        <AddServiceModal
          quoteId={quote.id}
          currency={quote.currency || "BRL"}
          onClose={() => setOpenService(false)}
          onAdded={async () => {
            setOpenService(false);
            await refresh();
          }}
        />
      )}

      {openDiscount && (
        <DiscountModal
          quoteId={quote.id}
          currency={quote.currency || "BRL"}
          onClose={() => setOpenDiscount(false)}
          onSaved={async () => {
            setOpenDiscount(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
