globalThis.process ??= {}; globalThis.process.env ??= {};
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';

const POST = async ({ request }) => {
  {
    return new Response("Faltam PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
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
