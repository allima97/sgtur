import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY!
);

function diffDays(a?: string, b?: string) {
  if (!a || !b) return 1;
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(
    1,
    Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const {
      item_type,
      servico_fornecedor_id,
      quantity,
      data_inicio,
      data_fim,
      currency,
    } = body;

    if (!item_type || !servico_fornecedor_id || !quantity) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos" }),
        { status: 400 }
      );
    }

    /* -------------------------------------------------------
       1) SERVIÇO + FORNECEDOR
    ------------------------------------------------------- */
    const { data: servico, error: servErr } = await supabase
      .from("servicos_fornecedor")
      .select(
        `
        id,
        nome,
        tipo,
        fornecedores (
          nome_completo,
          nome_fantasia
        )
      `
      )
      .eq("id", servico_fornecedor_id)
      .single();

    if (servErr || !servico) {
      return new Response(
        JSON.stringify({ error: "Serviço não encontrado" }),
        { status: 404 }
      );
    }

    const fornecedorNome =
      servico.fornecedores?.nome_fantasia ||
      servico.fornecedores?.nome_completo ||
      "Fornecedor";

    /* -------------------------------------------------------
       2) PREÇO BASE
    ------------------------------------------------------- */
    const { data: prices, error: priceErr } = await supabase
      .from("servico_fornecedor_price")
      .select("*")
      .eq("servico_fornecedor_id", servico_fornecedor_id)
      .eq("ativo", true);

    if (priceErr || !prices || prices.length === 0) {
      return new Response(
        JSON.stringify({ error: "Preço do serviço não encontrado" }),
        { status: 404 }
      );
    }

    // Seleciona o primeiro preço ativo (ou você pode melhorar isso depois)
    const price = prices.find((p) => p.moeda === currency) || prices[0];

    let unitPrice = Number(price.valor_base);

    /* -------------------------------------------------------
       3) AJUSTES POR PERÍODO
    ------------------------------------------------------- */
    const { data: periods } = await supabase
      .from("servico_fornecedor_price_period")
      .select("*")
      .eq("servico_fornecedor_price_id", price.id)
      .lte("data_inicio", data_fim ?? data_inicio)
      .gte("data_fim", data_inicio ?? data_fim);

    if (periods) {
      for (const p of periods) {
        if (p.ajuste_tipo === "FIXED") {
          unitPrice += Number(p.ajuste_valor);
        } else if (p.ajuste_tipo === "PERCENT") {
          unitPrice += unitPrice * (Number(p.ajuste_valor) / 100);
        }
      }
    }

    /* -------------------------------------------------------
       4) QUANTIDADE EFETIVA
    ------------------------------------------------------- */
    let effectiveQty = Number(quantity);

    if (price.tipo_valor === "PER_DIA") {
      const days = diffDays(data_inicio, data_fim);
      effectiveQty = days * Number(quantity);
    }

    // PER_RESERVA → ignora quantity > 1
    if (price.tipo_valor === "PER_RESERVA") {
      effectiveQty = 1;
    }

    /* -------------------------------------------------------
       5) TOTAL
    ------------------------------------------------------- */
    const total = unitPrice * effectiveQty;

    /* -------------------------------------------------------
       6) SNAPSHOT FINAL
    ------------------------------------------------------- */
    const description = `${item_type} — ${servico.nome}${
      data_inicio ? ` — ${data_inicio}` : ""
    }${data_fim ? ` a ${data_fim}` : ""} — ${price.tipo_valor}`;

    return new Response(
      JSON.stringify({
        quantity: effectiveQty,
        unit_price_snapshot: unitPrice,
        taxes_snapshot: 0,
        total_item: total,
        description_snapshot: description,
        supplier_snapshot: fornecedorNome,
        policy_snapshot: null,
        currency: currency || price.moeda || "BRL",
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Erro no preview do serviço" }),
      { status: 500 }
    );
  }
};
