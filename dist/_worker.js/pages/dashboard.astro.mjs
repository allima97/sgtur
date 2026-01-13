globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_B2E7go2h.mjs';
import { D as DashboardGeralIsland } from '../chunks/DashboardGeralIsland_DrkGRRtI.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_MjSq-9QN.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<!-- 
  Página do Dashboard Geral 
  Esta rota é protegida pelo middleware (autenticação + permissões)
-->${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard Geral" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="page-content-wrap"> ${renderComponent($$result2, "DashboardGeralIsland", DashboardGeralIsland, { "client:visible": true, "client:component-hydration": "visible", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/DashboardGeralIsland.tsx", "client:component-export": "default" })} </div> ` })}`;
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
