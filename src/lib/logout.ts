import { supabase } from "./supabase";
import { registrarLog } from "./logs";

export async function logoutUsuario() {
  try {
    // pegar sessão atual
    const { data } = await supabase.auth.getUser();
    const usuarioId = data?.user?.id || null;

    // capturar IP
    let ip = "";
    try {
      const resp = await fetch("https://api.ipify.org?format=json");
      const j = await resp.json();
      ip = j.ip || "";
    } catch {}

    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : "";

    // REGISTRAR LOG
    await registrarLog({
      user_id: usuarioId,
      acao: "logout",
      modulo: "login",
      detalhes: {
        ip,
        userAgent,
      },
    });

    // FAZER LOGOUT
    await supabase.auth.signOut();

    // REDIRECIONAR
    window.location.href = "/auth/login";
  } catch (e) {
    console.error("Erro ao sair:", e);
    window.location.href = "/auth/login";
  }
}
