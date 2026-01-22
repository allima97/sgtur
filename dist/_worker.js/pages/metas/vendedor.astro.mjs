globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_1RrlcxID.mjs';
import { M as MetasVendedorIsland } from '../../chunks/MetasVendedorIsland_CBTkP0RL.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';

const $$Vendedor = createComponent(($$result, $$props, $$slots) => {
  const pageTitle = "Metas do Vendedor";
  return renderTemplate`${renderComponent($$result, "Layout", $$DashboardLayout, { "title": pageTitle, "module": "Metas" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">${pageTitle}</h1> ${renderComponent($$result2, "MetasVendedorIsland", MetasVendedorIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/MetasVendedorIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/metas/vendedor.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/metas/vendedor.astro";
const $$url = "/metas/vendedor";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Vendedor,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
