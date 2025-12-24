globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as createAstro, e as renderHead, b as addAttribute, d as renderTemplate } from '../../../../chunks/astro/server_CVPGTMFc.mjs';
import { s as supabaseServer } from '../../../../chunks/supabaseServer_BkDQgKKv.mjs';
export { a as renderers } from '../../../../chunks/_@astro-renderers_lNEyfHhP.mjs';

const $$Astro = createAstro();
const $$Refunds = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Refunds;
  const saleId = Astro2.params.id;
  const { data: sale, error } = await supabaseServer.from("sale").select(`
    id,
    total,
    paid_total,
    balance_due,
    currency,
    status,
    financial_status
  `).eq("id", saleId).single();
  if (!sale) {
    console.error(error);
    throw new Error("Venda n\xE3o encontrada");
  }
  async function estornar(formData) {
    "use server";
    const amount = Number(formData.get("amount"));
    const reason = String(formData.get("reason") ?? "");
    const { error: error2 } = await supabaseServer.rpc("registrar_estorno", {
      p_sale_id: saleId,
      p_amount: amount,
      p_reason: reason
    });
    if (error2) throw error2;
  }
  async function cancelar(formData) {
    "use server";
    const reason = String(formData.get("reason"));
    const penalty = Number(formData.get("penalty") ?? 0);
    const { error: error2 } = await supabaseServer.rpc("cancelar_venda", {
      p_sale_id: saleId,
      p_reason: reason,
      p_penalty: penalty
    });
    if (error2) throw error2;
  }
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="UTF-8">${renderHead()}</head> <body> <h1>Estorno / Cancelamento</h1> <p> <strong>Status venda:</strong> ${sale.status}<br> <strong>Status financeiro:</strong> ${sale.financial_status} </p> <p> <strong>Total:</strong> ${sale.currency} ${sale.total}<br> <strong>Pago:</strong> ${sale.currency} ${sale.paid_total}<br> <strong>Saldo:</strong> ${sale.currency} ${sale.balance_due} </p> <hr> <h2>🔁 Estorno</h2> <form method="post"${addAttribute(estornar, "action")}> <input type="number" step="0.01" name="amount" placeholder="Valor do estorno" required> <input type="text" name="reason" placeholder="Motivo do estorno"> <button type="submit">Registrar estorno</button> </form> <hr> <h2>⛔ Cancelar venda</h2> <form method="post"${addAttribute(cancelar, "action")}> <input type="text" name="reason" placeholder="Motivo do cancelamento" required> <input type="number" step="0.01" name="penalty" placeholder="Multa (se houver)"> <button type="submit">
Cancelar venda
</button> </form> <hr> <p> <a${addAttribute(`/admin/sales/${saleId}`, "href")}>⬅ Voltar para a venda</a> </p> </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/sales/[id]/refunds.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/sales/[id]/refunds.astro";
const $$url = "/admin/sales/[id]/refunds";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Refunds,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
