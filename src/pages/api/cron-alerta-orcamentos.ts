import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

type OpcaoAlerta = {
  diasJanela?: number;
  diasSemInteracao?: number;
  diasThrottle?: number;
  marcarEnviado?: boolean;
  mensagem?: string;
  canal?: string;
  destinatario?: string;
  dryRun?: boolean;
  webhook?: string;
  diasStatus?: Record<string, number>;
  mensagensStatus?: Record<string, string>;
};

type OrcamentoRow = {
  id: string;
  status: string | null;
  data_orcamento: string | null;
  data_viagem: string | null;
};

type InteracaoRow = {
  id: string;
  orcamento_id: string;
  tipo: string | null;
  created_at: string | null;
};

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string;
const SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string;
const CRON_SECRET = (import.meta.env.CRON_SECRET_ALERTAS || import.meta.env.CRON_SECRET) as string;
const ALERTA_WEBHOOK = (import.meta.env.ALERTA_WEBHOOK_URL || import.meta.env.WEBHOOK_ALERTA_ORCAMENTOS) as
  | string
  | undefined;
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY as string | undefined;
const ALERTA_FROM_EMAIL = import.meta.env.ALERTA_FROM_EMAIL as string | undefined;
const SENDGRID_API_KEY = import.meta.env.SENDGRID_API_KEY as string | undefined;
const SENDGRID_FROM_EMAIL = import.meta.env.SENDGRID_FROM_EMAIL as string | undefined;

function diasEntre(dataIso: string | null) {
  if (!dataIso) return Number.POSITIVE_INFINITY;
  const diff = Date.now() - new Date(dataIso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function diasAté(dataIso: string | null) {
  if (!dataIso) return Number.POSITIVE_INFINITY;
  const alvo = new Date(dataIso).getTime();
  const diff = alvo - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function enviarEmailResend({
  to,
  subject,
  html,
  text,
}: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  if (!RESEND_API_KEY || !ALERTA_FROM_EMAIL) {
    console.warn("Resend não configurado (RESEND_API_KEY ou ALERTA_FROM_EMAIL ausentes).");
    return { status: "skipped" };
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: ALERTA_FROM_EMAIL,
        to,
        subject,
        html,
        text,
      }),
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(`Resend status ${resp.status}: ${JSON.stringify(j)}`);
    }
    return { status: "sent", id: j?.id };
  } catch (err: any) {
    console.error("Erro ao enviar e-mail (Resend):", err);
    return { status: "failed", error: err?.message || "erro" };
  }
}

async function enviarEmailSendGrid({
  to,
  subject,
  html,
  text,
}: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.warn("SendGrid não configurado (SENDGRID_API_KEY ou SENDGRID_FROM_EMAIL ausentes).");
    return { status: "skipped" };
  }
  try {
    const personalizations = to.map((dest) => ({ to: [{ email: dest }] }));
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations,
        from: { email: SENDGRID_FROM_EMAIL },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`SendGrid status ${resp.status}: ${body}`);
    }
    return { status: "sent" };
  } catch (err: any) {
    console.error("Erro ao enviar e-mail (SendGrid):", err);
    return { status: "failed", error: err?.message || "erro" };
  }
}

async function processarAlerta(opcoes: OpcaoAlerta, secretHeader: string | null) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response("Faltam PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
  }

  if (!CRON_SECRET || secretHeader !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const diasJanela = Number(opcoes.diasJanela ?? 7);
  const diasSemInteracao = Number(opcoes.diasSemInteracao ?? 7);
  const diasThrottle = Number(opcoes.diasThrottle ?? 1);
  const marcarEnviado = !!opcoes.marcarEnviado;
  const dryRun = !!opcoes.dryRun;
  const webhook = opcoes.webhook || ALERTA_WEBHOOK || "";
  const diasStatusMap = opcoes.diasStatus || {};
  const mensagensStatus = opcoes.mensagensStatus || {};

  const mensagemTemplate =
    opcoes.mensagem ||
    "Alerta automático de follow-up. Status: {{status}}. Viagem: {{viagem}}. Gerado em {{agora}}.";

  const canal = opcoes.canal || "email";
  const destinatario = opcoes.destinatario || "";

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Orçamentos nos status elegíveis
  const { data: orcamentos, error: orcError } = await supabase
    .from("orcamentos")
    .select("id, status, data_orcamento, data_viagem")
    .in("status", ["novo", "enviado", "negociando"]);

  if (orcError) {
    return new Response(`Erro ao buscar orçamentos: ${orcError.message}`, { status: 500 });
  }

  const ids = (orcamentos || []).map((o) => o.id).filter(Boolean);
  const interacoesMap: Record<string, InteracaoRow> = {};
  const alertaMap: Record<string, InteracaoRow> = {};

  if (ids.length) {
    const { data: interacoes } = await supabase
      .from("orcamento_interacoes")
      .select("id, orcamento_id, tipo, created_at")
      .in("orcamento_id", ids)
      .order("created_at", { ascending: false });

    (interacoes || []).forEach((i) => {
      if (!interacoesMap[i.orcamento_id]) {
        interacoesMap[i.orcamento_id] = i;
      }
      if (i.tipo === "alerta" && !alertaMap[i.orcamento_id]) {
        alertaMap[i.orcamento_id] = i;
      }
    });
  }

  const pendentes: OrcamentoRow[] = [];

  (orcamentos || []).forEach((o) => {
    const diasViagem = diasAté(o.data_viagem);
    const diasCriacao = diasEntre(o.data_orcamento);
    const ultimaInteracao = interacoesMap[o.id];
    const diasInteracao = diasEntre(ultimaInteracao?.created_at || null);

    const limiteInteracao = diasStatusMap[o.status || ""] ?? diasSemInteracao;
    const limiteViagem = diasStatusMap[`viagem_${o.status || ""}`] ?? diasJanela;

    const viagemProximaOuAtrasada = Number.isFinite(diasViagem) && diasViagem <= diasJanela;
    const semDataEAntigo = !o.data_viagem && diasCriacao >= diasSemInteracao;
    const semInteracaoRecente = !ultimaInteracao?.created_at || diasInteracao >= limiteInteracao;

    const viagemCritica = Number.isFinite(diasViagem) && diasViagem <= limiteViagem;

    if (viagemProximaOuAtrasada || viagemCritica || semDataEAntigo || semInteracaoRecente) {
      pendentes.push(o);
    }
  });

  const agora = new Date();
  const throttleLimite = new Date(agora.getTime() - diasThrottle * 24 * 60 * 60 * 1000);

  const candidatos = pendentes.filter((o) => {
    const ultimoAlerta = alertaMap[o.id];
    if (!ultimoAlerta?.created_at) return true;
    const dataUltimo = new Date(ultimoAlerta.created_at);
    return dataUltimo < throttleLimite;
  });

  if (!candidatos.length) {
    return new Response(
      JSON.stringify({
        total: orcamentos?.length || 0,
        pendentes: pendentes.length,
        gerados: 0,
        mensagem: "Nenhum alerta criado (já notificados recentemente ou lista vazia).",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  const inserts = candidatos.map((o) => {
    const tmpl = mensagensStatus[o.status || ""] || mensagemTemplate;
    const msg = tmpl
      .replace("{{status}}", o.status || "novo")
      .replace("{{viagem}}", o.data_viagem || "sem data")
      .replace("{{agora}}", agora.toISOString())
      .replace("{{canal}}", canal)
      .replace("{{destinatario}}", destinatario || "(não informado)");

    // Placeholder de envio — aqui seria o ponto para integrar e-mail/WhatsApp
    console.log(`[ALERTA-ORCAMENTO] enviando via ${canal} para ${destinatario || "(destinatário vazio)"}: ${msg}`);

    return {
      orcamento_id: o.id,
      tipo: "alerta",
      mensagem: msg,
    };
  });

  const webhookPayload = {
    canal,
    destinatario,
    total: orcamentos?.length || 0,
    pendentes: pendentes.length,
    gerados: inserts.length,
    diasStatus: diasStatusMap,
    alertas: inserts.map((i) => ({
      orcamento_id: i.orcamento_id,
      mensagem: i.mensagem,
    })),
  };

  if (dryRun) {
    return new Response(
      JSON.stringify({
        total: orcamentos?.length || 0,
        pendentes: pendentes.length,
        gerados: inserts.length,
        statusAtualizados: 0,
        dryRun: true,
        webhook: webhook ? "skipped" : "not_set",
        email: canal === "email" ? "skipped" : "not_used",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  const { error: insertError } = await supabase.from("orcamento_interacoes").insert(inserts);
  if (insertError) {
    return new Response(`Erro ao salvar alertas: ${insertError.message}`, { status: 500 });
  }

  let atualizadosStatus = 0;
  if (marcarEnviado && candidatos.length) {
    const { error: upErr } = await supabase
      .from("orcamentos")
      .update({ status: "enviado" })
      .in("id", candidatos.map((c) => c.id));
    if (!upErr) atualizadosStatus = candidatos.length;
  }

  // Notificação externa opcional (webhook)
  let webhookStatus = "skipped";
  if (webhook) {
    try {
      const resp = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
      webhookStatus = `sent:${resp.status}`;
    } catch (err) {
      webhookStatus = `failed:${(err as Error)?.message || "erro"}`;
      console.error("Erro ao enviar webhook de alerta:", err);
    }
  }

  // E-mail direto (Resend) se canal = email e destinatário configurado
  let emailStatus = "not_used";
  if (canal === "email" && destinatario) {
    const toList = destinatario
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (toList.length) {
      const subject = "SGTUR - Alertas de follow-up de orçamentos";
      const listaHtml = inserts
        .map(
          (i) => `<li><strong>${i.orcamento_id}</strong> - ${i.mensagem}</li>`
        )
        .join("");
      const html = `<p>Resumo de alertas de follow-up (gerados em ${agora.toISOString()}):</p><ul>${listaHtml}</ul>`;
      const text = inserts.map((i) => `${i.orcamento_id} - ${i.mensagem}`).join("\n");
      const respResend = await enviarEmailResend({ to: toList, subject, html, text });
      if (respResend.status === "skipped") {
        const respSendGrid = await enviarEmailSendGrid({ to: toList, subject, html, text });
        emailStatus = respSendGrid.status || "unknown";
      } else {
        emailStatus = respResend.status || "unknown";
      }
    }
  }

  // Log leve da execução (ignora erro se tabela não existir)
  try {
    await supabase.from("cron_log_alertas").insert({
      tipo: "orcamento_alerta",
      total: orcamentos?.length || 0,
      pendentes: pendentes.length,
      gerados: inserts.length,
      status_atualizados: atualizadosStatus,
      webhook_status: webhookStatus,
      email_status: emailStatus,
      dry_run: dryRun,
      dias_status: diasStatusMap,
      canal,
      destinatario,
      criado_em: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Log de execução não gravado (cron_log_alertas).", err);
  }

  return new Response(
    JSON.stringify({
      total: orcamentos?.length || 0,
      pendentes: pendentes.length,
      gerados: inserts.length,
      statusAtualizados: atualizadosStatus,
      webhook: webhookStatus,
      email: emailStatus,
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

export const GET: APIRoute = async ({ request }) => {
  return processarAlerta({}, request.headers.get("x-cron-secret"));
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  return processarAlerta(body as OpcaoAlerta, request.headers.get("x-cron-secret"));
};
