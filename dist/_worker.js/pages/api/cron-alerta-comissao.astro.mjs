globalThis.process ??= {}; globalThis.process.env ??= {};
export { a as renderers } from '../../chunks/_@astro-renderers_lNEyfHhP.mjs';

const POST = async ({ request }) => {
  request.headers.get("x-cron-secret");
  {
    return new Response("Unauthorized", { status: 401 });
  }
};
const GET = async ({ request }) => {
  request.headers.get("x-cron-secret");
  {
    return new Response("Unauthorized", { status: 401 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
