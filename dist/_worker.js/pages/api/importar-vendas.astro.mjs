globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as readSync, u as utils } from '../../chunks/xlsx_DyslCs8o.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_lNEyfHhP.mjs';

const POST = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return new Response(JSON.stringify({ error: "Arquivo não enviado." }), { status: 400 });
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = readSync(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = utils.sheet_to_json(sheet, { defval: null });
    const vendas = json.filter((row) => row["CONSULTOR"] && row["VALOR TOTAL"]).map((row) => ({
      consultor: row["CONSULTOR"],
      valor: Number(row["VALOR TOTAL"]) || 0,
      data: row["DATA"],
      recibo: row["RECIBO/LOC"]
      // outros campos se necessário
    }));
    return new Response(JSON.stringify({ importados: vendas.length }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro ao processar arquivo." }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
