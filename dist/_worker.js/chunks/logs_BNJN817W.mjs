globalThis.process ??= {}; globalThis.process.env ??= {};
import { s as supabase } from './supabase_Di0qno_D.mjs';

async function registrarLog({
  user_id,
  acao,
  modulo,
  detalhes = {}
}) {
  try {
    let ip = "";
    try {
      const resp = await fetch("https://api.ipify.org?format=json");
      const j = await resp.json();
      ip = j.ip || "";
    } catch (_) {
    }
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
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

export { registrarLog as r };
