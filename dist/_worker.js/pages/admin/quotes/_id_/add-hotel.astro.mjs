globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, f as createAstro, l as renderHead, h as addAttribute, r as renderTemplate } from '../../../../chunks/astro/server_Cob7n0Cm.mjs';
import { s as supabaseServer } from '../../../../chunks/supabaseServer_m5uNaTML.mjs';
export { r as renderers } from '../../../../chunks/_@astro-renderers_DxUIN8pq.mjs';

const $$Astro = createAstro();
const $$AddHotel = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AddHotel;
  const quoteId = Astro2.params.id;
  const { data: quote } = await supabaseServer.from("quote").select(`
    id,
    status,
    inquiry:inquiry_id (
      checkin,
      checkout,
      adults,
      children
    )
  `).eq("id", quoteId).single();
  if (!quote || quote.status !== "DRAFT") {
    throw new Error("Quote inv\xE1lido ou n\xE3o edit\xE1vel");
  }
  const { data: ratePlans } = await supabaseServer.from("rate_plan").select(`
    id,
    codigo,
    regime,
    room_type:room_type_id (
      nome,
      hotel:hotel_id (
        id
      )
    )
  `).eq("ativo", true).limit(50);
  async function adicionarHotel(formData) {
    "use server";
    const ratePlanId = String(formData.get("rate_plan_id"));
    const { error } = await supabaseServer.rpc("adicionar_hotel_ao_quote", {
      p_quote_id: quoteId,
      p_rate_plan_id: ratePlanId
    });
    if (error) throw error;
  }
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="UTF-8">${renderHead()}</head> <body> <h1>Adicionar Hotel ao Carrinho</h1> <p>
Datas: ${quote.inquiry.checkin} → ${quote.inquiry.checkout}<br>
Pax: ${quote.inquiry.adults} adultos, ${quote.inquiry.children} crianças
</p> <hr> <ul> ${ratePlans?.map((rp) => renderTemplate`<li> <strong>${rp.room_type.nome}</strong><br>
Plano: ${rp.codigo} — ${rp.regime} <form method="post"${addAttribute(adicionarHotel, "action")}> <input type="hidden" name="rate_plan_id"${addAttribute(rp.id, "value")}> <button type="submit">
➕ Adicionar ao carrinho
</button> </form> </li>`)} </ul> <p> <a${addAttribute(`/admin/quotes/${quoteId}`, "href")}>
⬅ Voltar para o carrinho
</a> </p> </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/quotes/[id]/add-hotel.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/quotes/[id]/add-hotel.astro";
const $$url = "/admin/quotes/[id]/add-hotel";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$AddHotel,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
