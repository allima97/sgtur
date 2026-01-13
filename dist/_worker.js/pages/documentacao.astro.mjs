globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9jQHs-i.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_MjSq-9QN.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`import Layout from "../../layouts/DashboardLayout.astro";
import DocumentationPortalIsland from "../../components/islands/DocumentationPortalIsland.tsx";

const pageTitle = "Documentação do Sistema";
${renderComponent($$result, "Layout", Layout, { "title": pageTitle, "module": "Admin" }, { "default": ($$result2) => renderTemplate`${maybeRenderHead()}<h1 class="page-title">${pageTitle}</h1>${renderComponent($$result2, "DocumentationPortalIsland", DocumentationPortalIsland, { "client:load": true, "client:component-hydration": "load" })}` })}
const pageTitle = "Documentação do Sistema";
---
${renderComponent($$result, "Layout", Layout, { "title": pageTitle, "module": "Admin" }, { "default": ($$result2) => renderTemplate`<h1 class="page-title">${pageTitle}</h1><div class="card-base card-blue mb-3"><p>
Esta página exibe a documentação técnica gerada automaticamente.
      Atualize este conteúdo conforme novos módulos forem implementados.
</p></div>${renderComponent($$result2, "DocumentationIsland", DocumentationIsland, { "client:load": true, "client:component-hydration": "load" })}` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/documentacao/index.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/documentacao/index.astro";
const $$url = "/documentacao";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
