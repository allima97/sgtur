globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B-SnFw9s.mjs';
import { j as jsxRuntimeExports } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';

function ImportarVendasIsland() {
  const [file, setFile] = reactExports.useState(null);
  const [status, setStatus] = reactExports.useState(null);
  const inputRef = reactExports.useRef(null);
  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setStatus("Selecione um arquivo Excel (.xlsx)");
      return;
    }
    setStatus("Enviando arquivo...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch("/api/importar-vendas", {
        method: "POST",
        body: formData
      });
      const data = await resp.json();
      if (resp.ok) {
        setStatus(`Importação concluída: ${data.importados} vendas importadas.`);
      } else {
        setStatus(data.error || "Erro ao importar arquivo.");
      }
    } catch (err) {
      setStatus("Erro ao enviar arquivo.");
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-config", style: { maxWidth: 500, margin: "0 auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Importar Vendas (Excel)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleUpload, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "file",
          accept: ".xlsx",
          ref: inputRef,
          onChange: (e) => setFile(e.target.files?.[0] || null),
          style: { marginBottom: 12 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "submit", children: "Importar" })
    ] }),
    status && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: status })
  ] });
}

const $$ImportarVendas = createComponent(($$result, $$props, $$slots) => {
  const activePage = "importar-vendas";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Importar Vendas", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">Importar Vendas</h1> <p class="page-subtitle">Envie uma planilha Excel (.xlsx) para importar vendas em lote.</p> ${renderComponent($$result2, "ImportarVendasIsland", ImportarVendasIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ImportarVendasIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/gestor/importar-vendas.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/gestor/importar-vendas.astro";
const $$url = "/gestor/importar-vendas";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$ImportarVendas,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
