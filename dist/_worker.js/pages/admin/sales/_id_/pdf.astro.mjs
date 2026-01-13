globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, r as renderTemplate } from '../../../../chunks/astro/server_C9jQHs-i.mjs';
export { r as renderers } from '../../../../chunks/_@astro-renderers_MjSq-9QN.mjs';

const $$Pdf = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate``;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/sales/[id]/pdf.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/admin/sales/[id]/pdf.astro";
const $$url = "/admin/sales/[id]/pdf";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Pdf,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
