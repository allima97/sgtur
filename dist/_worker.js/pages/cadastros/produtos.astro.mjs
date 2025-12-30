globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as renderComponent, d as renderTemplate } from '../../chunks/astro/server_CVPGTMFc.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_CdOMU9M7.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_uGVYbAeU.mjs';
import { P as ProdutosIsland } from '../../chunks/ProdutosIsland_BxTfZ6nV.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_APQgoOvT.mjs';

const $$Produtos = createComponent(($$result, $$props, $$slots) => {
  const activePage = "produtos";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Produtos", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Produtos", "subtitle": "Cadastre produtos/destinos vinculados a cidades e tipos de produto.", "color": "blue" })} ${renderComponent($$result2, "ProdutosIsland", ProdutosIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ProdutosIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/produtos.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/produtos.astro";
const $$url = "/cadastros/produtos";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Produtos,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
