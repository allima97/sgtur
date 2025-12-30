globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as createAstro, e as renderHead, d as renderTemplate } from '../../../../chunks/astro/server_CVPGTMFc.mjs';
import { s as supabaseServer } from '../../../../chunks/supabaseServer_DS59bdrg.mjs';
/* empty css                                        */
export { a as renderers } from '../../../../chunks/_@astro-renderers_APQgoOvT.mjs';

const $$Astro = createAstro();
const $$Pdf = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Pdf;
  const quoteId = Astro2.params.id;
  const { data: quote } = await supabaseServer.from("quote").select(`
    id,
    currency,
    total,
    valid_until,
    client:client_id ( nome, email ),
    items:quote_item (
      item_type,
      description_snapshot,
      quantity,
      unit_price_snapshot,
      total_item
    )
  `).eq("id", quoteId).single();
  if (!quote) {
    throw new Error("Or\xE7amento n\xE3o encontrado");
  }
  return renderTemplate`<html lang="pt-BR" data-astro-cid-d3vfhkf2> <head><meta charset="UTF-8"><meta charset="utf-8"><title>Orçamento #${renderTemplate`quote.id`}
    
  </title>${renderHead()}</head> <h1 data-astro-cid-d3vfhkf2>Orçamento</h1> <p data-astro-cid-d3vfhkf2> <strong data-astro-cid-d3vfhkf2>Cliente:</strong> ${quote.client.nome}<br data-astro-cid-d3vfhkf2> <strong data-astro-cid-d3vfhkf2>Validade:</strong> ${quote.valid_until} </p> <table data-astro-cid-d3vfhkf2> <thead data-astro-cid-d3vfhkf2> <tr data-astro-cid-d3vfhkf2> <th data-astro-cid-d3vfhkf2>Item</th> <th data-astro-cid-d3vfhkf2>Qtd</th> <th data-astro-cid-d3vfhkf2>Unitário</th> <th data-astro-cid-d3vfhkf2>Total</th> </tr> </thead> <tbody data-astro-cid-d3vfhkf2> ${quote.items.map((item) => renderTemplate`<tr data-astro-cid-d3vfhkf2> <td data-astro-cid-d3vfhkf2>${item.description_snapshot}</td> <td data-astro-cid-d3vfhkf2>${item.quantity}</td> <td data-astro-cid-d3vfhkf2>${quote.currency} ${item.unit_price_snapshot}</td> <td data-astro-cid-d3vfhkf2>${quote.currency} ${item.total_item}</td> </tr>`)} </tbody> </table> <p class="total" data-astro-cid-d3vfhkf2>
Total: ${quote.currency} ${quote.total} </p> <hr data-astro-cid-d3vfhkf2> <p data-astro-cid-d3vfhkf2>
Este orçamento está sujeito à disponibilidade e reajustes
      até a confirmação.
</p> </html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/quotes/[id]/pdf.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/quotes/[id]/pdf.astro";
const $$url = "/admin/quotes/[id]/pdf";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Pdf,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
