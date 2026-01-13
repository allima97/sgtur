globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B2E7go2h.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_pW02Hlay.mjs';
import { P as ProdutosIsland } from '../../chunks/ProdutosIsland_DeWM3FG7.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';

const $$Destinos = createComponent(($$result, $$props, $$slots) => {
  const activePage = "produtos";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Produtos", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Produtos", "subtitle": "Gerencie produtos/destinos vinculados a cidades e tipos de produto.", "color": "blue" })} ${renderComponent($$result2, "ProdutosIsland", ProdutosIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ProdutosIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/destinos.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/destinos.astro";
const $$url = "/cadastros/destinos";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Destinos,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
