globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_1RrlcxID.mjs';
import { $ as $$HeaderPage } from '../chunks/HeaderPage_Ck_yWTiO.mjs';
import { D as DashboardGeralIsland } from '../chunks/DashboardGeralIsland_DsJ6EBvm.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_MjSq-9QN.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const activePage = "dashboard";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard Geral", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="page-content-wrap"> ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Dashboard Geral", "subtitle": "Vis\xE3o consolidada do m\xEAs: metas, vendas, produtos diferenciados, or\xE7amentos e aniversariantes.", "color": "purple" })} ${renderComponent($$result2, "DashboardGeralIsland", DashboardGeralIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/DashboardGeralIsland.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/index.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
