import { supabase } from "./supabase";

export async function registrarLog({
  user_id,
  acao,
  modulo,
  detalhes = {}
}: {
  user_id: string | null;
  acao: string;
  modulo: string;
  detalhes?: any;
}) {
  try {
    let ip = "";
    try {
      const resp = await fetch("https://api.ipify.org?format=json");
      const j = await resp.json();
      ip = j.ip || "";
    } catch (_) {}

    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : "";

    await supabase.from("logs").insert({
      user_id,
      acao,
      modulo,
      detalhes,
      ip,
      user_agent: userAgent
    });
  } catch (error) {
    console.error("Erro ao registrar log:", error);
  }
}
