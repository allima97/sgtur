globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_B-SnFw9s.mjs';
import { D as DashboardGeralIsland } from '../chunks/DashboardGeralIsland_D0npFyid.mjs';
export { a as renderers } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<!-- 
  Página do Dashboard Geral 
  Esta rota é protegida pelo middleware (autenticação + permissões)
-->${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard Geral" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section style="
      padding: 16px;
      width: 100%;
      max-width: 1300px;
      margin: 0 auto;
    "> ${renderComponent($$result2, "DashboardGeralIsland", DashboardGeralIsland, { "client:visible": true, "client:component-hydration": "visible", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/DashboardGeralIsland.tsx", "client:component-export": "default" })} </section> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/index.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/index.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
