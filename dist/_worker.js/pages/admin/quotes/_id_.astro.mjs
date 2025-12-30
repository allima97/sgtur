globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as createAstro, e as renderHead, d as renderTemplate, b as addAttribute, f as renderComponent, F as Fragment } from '../../../chunks/astro/server_CVPGTMFc.mjs';
import { c as createClient } from '../../../chunks/wrapper_6q0T_V9b.mjs';
export { a as renderers } from '../../../chunks/_@astro-renderers_APQgoOvT.mjs';

const $$Astro = createAstro();
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const supabase = createClient(
    "https://ggqmvruerbaqxthhnxrm.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncW12cnVlcmJhcXh0aGhueHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc2MzQ3OCwiZXhwIjoyMDgwMzM5NDc4fQ.2MwbrYwtD-HeeoCw4g5PBadXLpo0gY8eoRjLxQglOQQ"
  );
  const quoteId = Astro2.params.id;
  const { data: quote, error: quoteError } = await supabase.from("quote").select(`
    id,
    status,
    currency,
    valid_until,
    total,
    client_id,
    seller_id
  `).eq("id", quoteId).single();
  if (quoteError || !quote) {
    throw new Error("Quote não encontrado");
  }
  const { data: items } = await supabase.from("quote_item").select(`
    id,
    item_type,
    description_snapshot,
    quantity,
    unit_price_snapshot,
    total_item
  `).eq("quote_id", quoteId).order("created_at", { ascending: true });
  async function removerItem(formData) {
    "use server";
    const itemId = String(formData.get("item_id"));
    const { error } = await supabase.rpc("remover_quote_item", {
      p_quote_item_id: itemId
    });
    if (error) throw error;
  }
  async function gerarOrcamento() {
    "use server";
    const { error } = await supabase.rpc("enviar_quote", {
      p_quote_id: quoteId
    });
    if (error) throw error;
  }
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="UTF-8">${renderHead()}</head> <body> <h1>Carrinho / Orçamento</h1> <p> <strong>Status:</strong> ${quote.status}<br> <strong>Validade:</strong> ${quote.valid_until}<br> <strong>Total:</strong> ${quote.currency} ${quote.total.toFixed(2)} </p> <hr> <h2>Itens</h2> ${items?.length === 0 && renderTemplate`<p>Nenhum item adicionado.</p>`} <ul> ${items?.map((item) => renderTemplate`<li> <strong>${item.item_type}</strong><br> ${item.description_snapshot}<br>
Qtd: ${item.quantity} —
          Unit: ${quote.currency} ${item.unit_price_snapshot.toFixed(2)} —
          Total: ${quote.currency} ${item.total_item.toFixed(2)} ${quote.status === "DRAFT" && renderTemplate`<form method="post"${addAttribute(removerItem, "action")}> <input type="hidden" name="item_id"${addAttribute(item.id, "value")}> <button type="submit">Remover</button> </form>`} </li>`)} </ul> <hr> ${quote.status === "DRAFT" && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result2) => renderTemplate` <p> <a${addAttribute(`/admin/inquiries/${quote.inquiry_id}`, "href")}>
➕ Adicionar itens
</a> </p> <form method="post"${addAttribute(gerarOrcamento, "action")}> <button type="submit">
📄 Gerar orçamento para o cliente
</button> </form> ` })}`} ${quote.status !== "DRAFT" && renderTemplate`<p>
🔒 Este orçamento já foi enviado ao cliente e não pode ser alterado.
</p>`} </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/quotes/[id].astro", void 0);
const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/quotes/[id].astro";
const $$url = "/admin/quotes/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
