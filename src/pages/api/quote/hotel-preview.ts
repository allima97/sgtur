import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY!
);

function diffNights(checkin: string, checkout: string) {
  const inD = new Date(checkin);
  const outD = new Date(checkout);
  return Math.max(
    1,
    Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const {
      hotel_id,
      room_type_id,
      rate_plan_id,
      checkin,
      checkout,
      adults,
      children,
      rooms,
      currency,
    } = body;

    if (!hotel_id || !room_type_id || !rate_plan_id || !checkin || !checkout) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
      });
    }

    const nights = diffNights(checkin, checkout);

    /* -------------------------------------------------------
       1) RATE BASE
    ------------------------------------------------------- */
    const { data: rates, error: rateErr } = await supabase
      .from("hotel_rate")
      .select("*")
      .eq("rate_plan_id", rate_plan_id)
      .eq("ativo", true);

    if (rateErr || !rates || rates.length === 0) {
      return new Response(
        JSON.stringify({ error: "Tarifa não encontrada" }),
        { status: 404 }
      );
    }

    const rate = rates[0];
    let basePerNight = Number(rate.valor_base);

    /* -------------------------------------------------------
       2) AJUSTES POR PERÍODO
    ------------------------------------------------------- */
    const { data: periods } = await supabase
      .from("hotel_rate_period")
      .select("*")
      .eq("hotel_rate_id", rate.id)
      .lte("data_inicio", checkout)
      .gte("data_fim", checkin);

    if (periods) {
      for (const p of periods) {
        if (p.ajuste_tipo === "FIXED") {
          basePerNight += Number(p.ajuste_valor);
        } else if (p.ajuste_tipo === "PERCENT") {
          basePerNight += basePerNight * (Number(p.ajuste_valor) / 100);
        }
      }
    }

    /* -------------------------------------------------------
       3) EXTRAS DE OCUPAÇÃO
    ------------------------------------------------------- */
    let extras = 0;

    const { data: occs } = await supabase
      .from("hotel_rate_occupancy")
      .select("*")
      .eq("hotel_rate_id", rate.id);

    if (occs) {
      for (const o of occs) {
        if (o.tipo === "ADULT_EXTRA" && adults > 2) {
          extras += (adults - 2) * Number(o.valor);
        }
        if (o.tipo === "CHILD" && children > 0) {
          extras += children * Number(o.valor);
        }
        if (o.tipo === "EXTRABED") {
          extras += Number(o.valor);
        }
      }
    }

    /* -------------------------------------------------------
       4) TOTAL LÍQUIDO
    ------------------------------------------------------- */
    const quantity = nights * Number(rooms || 1);
    const netTotal = (basePerNight + extras) * quantity;

    /* -------------------------------------------------------
       5) TAXAS
    ------------------------------------------------------- */
    let taxes = 0;

    const { data: fees } = await supabase
      .from("hotel_tax_fee")
      .select("*")
      .eq("hotel_id", hotel_id);

    if (fees) {
      for (const f of fees) {
        if (f.tipo === "FIXED") {
          if (f.por === "PER_NOITE") taxes += Number(f.valor) * nights;
          if (f.por === "PER_PAX")
            taxes += Number(f.valor) * (adults + children);
          if (f.por === "PER_RESERVA") taxes += Number(f.valor);
        }
        if (f.tipo === "PERCENT") {
          taxes += netTotal * (Number(f.valor) / 100);
        }
      }
    }

    /* -------------------------------------------------------
       6) POLÍTICA
    ------------------------------------------------------- */
    const { data: policies } = await supabase
      .from("hotel_policy")
      .select("*")
      .eq("rate_plan_id", rate_plan_id);

    const policyText =
      policies && policies.length
        ? policies
            .map(
              (p) =>
                `${p.tipo}: até ${p.dias_antes} dias antes — ${p.penalidade_tipo} ${p.penalidade_valor}`
            )
            .join(" | ")
        : "Sem política informada";

    /* -------------------------------------------------------
       7) RESPONSE FINAL (SNAPSHOT)
    ------------------------------------------------------- */
    const total = netTotal + taxes;

    return new Response(
      JSON.stringify({
        quantity,
        unit_price_snapshot: basePerNight,
        net_unit_snapshot: basePerNight,
        taxes_snapshot: taxes,
        total_item: total,
        description_snapshot: `Hotel — ${checkin} a ${checkout} (${nights} noites) — ${adults} adultos${
          children ? `, ${children} crianças` : ""
        } — ${rooms} quarto(s)`,
        policy_text: policyText,
        supplier_snapshot: "Hotel",
        currency: currency || rate.moeda || "BRL",
      }),
      { status: 200 }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Erro no preview do hotel" }),
      { status: 500 }
    );
  }
};
