import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: 'Arquivo não enviado.' }), { status: 400 });
  }
  try {
    // Salvar arquivo temporariamente
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Ler planilha
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
    // Filtrar e mapear vendas válidas
    const vendas = json.filter((row: any) => row['CONSULTOR'] && row['VALOR TOTAL']).map((row: any) => ({
      consultor: row['CONSULTOR'],
      valor: Number(row['VALOR TOTAL']) || 0,
      data: row['DATA'],
      recibo: row['RECIBO/LOC'],
      // outros campos se necessário
    }));
    // Aqui você pode salvar no banco (mock por enquanto)
    // await db.vendas.bulkInsert(vendas)
    return new Response(JSON.stringify({ importados: vendas.length }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Erro ao processar arquivo.' }), { status: 500 });
  }
};
