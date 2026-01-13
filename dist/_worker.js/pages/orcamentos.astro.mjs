globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, f as createAstro } from '../chunks/astro/server_C9jQHs-i.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_MjSq-9QN.mjs';

const $$Astro = createAstro();
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  return Astro2.redirect("/orcamentos/importar");
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/orcamentos/index.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/orcamentos/index.astro";
const $$url = "/orcamentos";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Index,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
