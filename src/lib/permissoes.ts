import { supabase } from "./supabase";

export async function getUserPermissions(userId: string) {
  const { data, error } = await supabase
    .from("modulo_acesso")
    .select("modulo, permissao, ativo")
    .eq("usuario_id", userId);

  if (error) {
    console.error("Erro carregando permissoes:", error);
    return {};
  }

  const mapa: Record<string, { permissao: string; ativo: boolean }> = {};

  for (const m of data ?? []) {
    mapa[m.modulo] = {
      permissao: m.permissao,
      ativo: m.ativo,
    };
  }

  return mapa;
}
