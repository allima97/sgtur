globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, f as createAstro, l as renderHead, h as addAttribute, r as renderTemplate } from '../../../../chunks/astro/server_Cob7n0Cm.mjs';
import { s as supabaseServer } from '../../../../chunks/supabaseServer_m5uNaTML.mjs';
export { r as renderers } from '../../../../chunks/_@astro-renderers_DxUIN8pq.mjs';

const $$Astro = createAstro();
const $$Payments = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Payments;
  const saleId = Astro2.params.id;
  const { data: sale, error: saleError } = await supabaseServer.from("sale").select(`
    id,
    client_id,
    seller_id,
    total,
    paid_total,
    balance_due,
    currency,
    financial_status
  `).eq("id", saleId).single();
  if (!sale) {
    console.error(saleError);
    throw new Error("Venda n\xE3o encontrada");
  }
  const { data: client } = await supabaseServer.from("clientes").select("nome").eq("id", sale.client_id).single();
  const { data: seller } = await supabaseServer.from("users").select("nome_completo").eq("id", sale.seller_id).single();
  const { data: payments } = await supabaseServer.from("payment").select(`
    id,
    method,
    amount,
    status,
    created_at
  `).eq("sale_id", saleId).order("created_at", { ascending: false });
  async function pagarSimples(formData) {
    "use server";
    const amount = Number(formData.get("amount"));
    const method = String(formData.get("method"));
    const { error } = await supabaseServer.rpc(
      "registrar_pagamento_simples",
      {
        p_sale_id: saleId,
        p_method: method,
        p_amount: amount
      }
    );
    if (error) throw error;
  }
  async function pagarParcelado(formData) {
    "use server";
    const total = Number(formData.get("total"));
    const installments = Number(formData.get("installments"));
    const { error } = await supabaseServer.rpc(
      "registrar_pagamento_parcelado",
      {
        p_sale_id: saleId,
        p_method: "CREDIT_CARD",
        p_total_amount: total,
        p_installments: installments,
        p_first_due_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
      }
    );
    if (error) throw error;
  }
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="UTF-8">${renderHead()}</head> <body> <h1>Pagamentos da Venda</h1> <p>
Cliente: <strong>${client?.nome ?? "-"}</strong><br>
Vendedor: <strong>${seller?.nome_completo ?? "-"}</strong> </p> <hr> <p> <strong>Total:</strong> ${sale.currency} ${sale.total}<br> <strong>Pago:</strong> ${sale.currency} ${sale.paid_total}<br> <strong>Saldo:</strong> ${sale.currency} ${sale.balance_due}<br> <strong>Status:</strong> ${sale.financial_status} </p> <hr> <h2>Registrar pagamento (PIX / Transferência)</h2> <form method="post"${addAttribute(pagarSimples, "action")}> <input type="number" step="0.01" name="amount" placeholder="Valor" required> <select name="method"> <option value="PIX">PIX</option> <option value="BANK_TRANSFER">Transferência</option> <option value="CASH">Dinheiro</option> </select> <button type="submit">Registrar pagamento</button> </form> <hr> <h2>Pagamento com cartão (parcelado)</h2> <form method="post"${addAttribute(pagarParcelado, "action")}> <input type="number" step="0.01" name="total" placeholder="Valor total" required> <input type="number" name="installments" placeholder="Parcelas" min="1" max="12" required> <button type="submit">Criar parcelamento</button> </form> <hr> <h2>Pagamentos registrados</h2> <ul> ${payments?.map((p) => renderTemplate`<li> ${p.method} — ${sale.currency} ${p.amount} — ${p.status} </li>`)} </ul> <p> <a${addAttribute(`/admin/sales/${saleId}`, "href")}>⬅ Voltar para a venda</a> </p> </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/sales/[id]/payments.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/sales/[id]/payments.astro";
const $$url = "/admin/sales/[id]/payments";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Payments,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
