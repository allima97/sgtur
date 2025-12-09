globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, m as maybeRenderHead, d as renderTemplate } from '../chunks/astro/server_C6IdV9ex.mjs';
export { a as renderers } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';

const $$Negado = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div style="padding:40px; text-align:center; color:#e2e8f0;"> <h1 style="font-size:2rem; margin-bottom:10px;">🚫 Acesso Negado</h1> <p>Você não possui permissão para acessar este módulo.</p> <a href="/dashboard" style="color:#38bdf8; font-size:1.2rem;">
Voltar ao Dashboard
</a> </div>`;
}, "/Users/allima97/Documents/GitHub/sgt-astro/src/pages/negado.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgt-astro/src/pages/negado.astro";
const $$url = "/negado";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Negado,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
