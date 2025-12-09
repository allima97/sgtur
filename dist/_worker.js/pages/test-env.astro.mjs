globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as renderHead, b as addAttribute, d as renderTemplate } from '../chunks/astro/server_C6Zr-jH2.mjs';
/* empty css                                    */
export { a as renderers } from '../chunks/_@astro-renderers_DAXFO6RA.mjs';

const $$TestEnv = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="pt-BR" data-astro-cid-bbnbanjr> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Test Env</title>${renderHead()}</head> <body data-astro-cid-bbnbanjr> <div class="card" data-astro-cid-bbnbanjr> <h1 data-astro-cid-bbnbanjr>Diagnóstico de Variáveis</h1> <p data-astro-cid-bbnbanjr>
Confirme se as variáveis públicas do Supabase estão chegando no build e
        no runtime.
</p> <ul data-astro-cid-bbnbanjr> <li data-astro-cid-bbnbanjr> <span data-astro-cid-bbnbanjr>PUBLIC_SUPABASE_URL</span> <span${addAttribute("missing", "class")} data-astro-cid-bbnbanjr> ${"MISSING"} </span> </li> <li data-astro-cid-bbnbanjr> <span data-astro-cid-bbnbanjr>PUBLIC_SUPABASE_ANON_KEY</span> <span${addAttribute("missing", "class")} data-astro-cid-bbnbanjr> ${"MISSING"} </span> </li> </ul> <p data-astro-cid-bbnbanjr>
Se estiver marcado como <strong data-astro-cid-bbnbanjr>MISSING</strong>, adicione as variáveis
        em <code data-astro-cid-bbnbanjr>Cloudflare Pages → Settings → Environment Variables</code>
(Production e Preview) e publique novamente.
</p> </div> </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/test-env.astro", void 0);
const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/test-env.astro";
const $$url = "/test-env";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$TestEnv,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
