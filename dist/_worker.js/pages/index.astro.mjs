globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_B-SnFw9s.mjs';
import { $ as $$HeaderPage } from '../chunks/HeaderPage_DCV0c2xr.mjs';
import { D as DashboardGeralIsland } from '../chunks/DashboardGeralIsland_D0npFyid.mjs';
export { a as renderers } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const activePage = "dashboard";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard Geral", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Dashboard Geral", "subtitle": "Vis\xE3o consolidada do m\xEAs: metas, vendas, produtos diferenciados, or\xE7amentos e aniversariantes.", "color": "purple" })} ${renderComponent($$result2, "DashboardGeralIsland", DashboardGeralIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/DashboardGeralIsland.tsx", "client:component-export": "default" })} ` })}`;
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
