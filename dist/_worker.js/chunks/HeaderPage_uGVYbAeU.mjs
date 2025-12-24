globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as createAstro, m as maybeRenderHead, b as addAttribute, r as renderSlot, d as renderTemplate } from './astro/server_CVPGTMFc.mjs';

const $$Astro = createAstro();
const $$HeaderPage = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$HeaderPage;
  const { title, subtitle = "", color = "blue" } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<header${addAttribute(`page-header ${color}-header`, "class")}> <div> <h1>${title}</h1> ${subtitle && renderTemplate`<p>${subtitle}</p>`} </div> <div> ${renderSlot($$result, $$slots["default"])} </div> </header>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/components/ui/HeaderPage.astro", void 0);

export { $$HeaderPage as $ };
