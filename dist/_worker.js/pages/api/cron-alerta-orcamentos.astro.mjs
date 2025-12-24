globalThis.process ??= {}; globalThis.process.env ??= {};
export { a as renderers } from '../../chunks/_@astro-renderers_lNEyfHhP.mjs';

async function processarAlerta(opcoes, secretHeader) {
  {
    return new Response("Unauthorized", { status: 401 });
  }
}
const GET = async ({ request }) => {
  return processarAlerta({}, request.headers.get("x-cron-secret"));
};
const POST = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  return processarAlerta(body, request.headers.get("x-cron-secret"));
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
