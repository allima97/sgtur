import { supabaseServer } from "../../lib/supabaseServer";

type BodyPayload = {
  cnpj?: string | null;
  nome_empresa?: string | null;
  nome_fantasia?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  allowCreate?: boolean | null;
};

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as BodyPayload;
    const cnpjRaw = body.cnpj ?? "";
    const cnpjLimpo = cnpjRaw.replace(/\D/g, "");
    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      return new Response("CNPJ invalido.", { status: 400 });
    }

    const cnpjFormatado = formatCnpj(cnpjLimpo);
    const selectCols =
      "id, nome_empresa, nome_fantasia, cnpj, endereco, telefone, cidade, estado";

    const { data: existenteLimpo, error: selectErr } = await supabaseServer
      .from("companies")
      .select(selectCols)
      .eq("cnpj", cnpjLimpo)
      .maybeSingle();

    if (selectErr) {
      return new Response(`Falha ao buscar empresa: ${selectErr.message}`, { status: 500 });
    }

    if (existenteLimpo) {
      return jsonResponse(existenteLimpo, 200);
    }

    if (cnpjFormatado !== cnpjLimpo) {
      const { data: existenteFormatado, error: selectFmtErr } = await supabaseServer
        .from("companies")
        .select(selectCols)
        .eq("cnpj", cnpjFormatado)
        .maybeSingle();
      if (selectFmtErr) {
        return new Response(`Falha ao buscar empresa: ${selectFmtErr.message}`, { status: 500 });
      }
      if (existenteFormatado) {
        return jsonResponse(existenteFormatado, 200);
      }
    }

    if (!body.allowCreate) {
      return new Response("Empresa nao encontrada.", { status: 404 });
    }

    const nomeEmpresa = (body.nome_empresa ?? "").trim();
    if (!nomeEmpresa) {
      return new Response("Informe o nome da empresa.", { status: 400 });
    }

    const payload = {
      cnpj: cnpjLimpo,
      nome_empresa: nomeEmpresa,
      nome_fantasia: (body.nome_fantasia ?? "").trim() || nomeEmpresa,
      telefone: (body.telefone ?? "").trim() || null,
      endereco: (body.endereco ?? "").trim() || null,
      cidade: (body.cidade ?? "").trim() || null,
      estado: (body.estado ?? "").trim().toUpperCase().slice(0, 2) || null,
    };

    const { data: criada, error: createErr } = await supabaseServer
      .from("companies")
      .insert(payload)
      .select(selectCols)
      .single();

    if (createErr) {
      return new Response(`Falha ao criar empresa: ${createErr.message}`, { status: 500 });
    }

    return jsonResponse(criada, 201);
  } catch (error: any) {
    return new Response(`Erro interno: ${error?.message ?? error}`, { status: 500 });
  }
}
