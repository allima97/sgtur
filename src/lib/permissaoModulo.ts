import { supabase } from "./supabase";

export async function getPermissaoModulo(userId: string, modulo: string) {
  const { data, error } = await supabase
    .from("modulo_acesso")
    .select("ativo, permissao")
    .eq("usuario_id", userId)
    .eq("modulo", modulo)
    .maybeSingle();

  if (error || !data) {
    console.error("Erro ao carregar permissao de modulo:", error);
    return { ativo: false, permissao: "view" as const };
  }

  return {
    ativo: data.ativo as boolean,
    permissao: data.permissao as "view" | "edit" | "admin",
  };
}
