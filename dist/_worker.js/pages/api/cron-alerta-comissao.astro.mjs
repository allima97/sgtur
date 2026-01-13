globalThis.process ??= {}; globalThis.process.env ??= {};
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';

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
