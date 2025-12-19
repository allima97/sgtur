import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

export type Permissao =
  | "none"
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "admin";

const permLevel = (p: Permissao | undefined): number => {
  switch (p) {
    case "admin":
      return 5;
    case "delete":
      return 4;
    case "edit":
      return 3;
    case "create":
      return 2;
    case "view":
      return 1;
    default:
      return 0;
  }
};

const normalizePermissao = (value?: string | null): Permissao => {
  const perm = (value || "").toLowerCase();
  if (perm === "admin") return "admin";
  if (perm === "delete") return "delete";
  if (perm === "edit") return "edit";
  if (perm === "create") return "create";
  if (perm === "view") return "view";
  return "none";
};

export function usePermissao(modulo: string) {
  const moduloTrimmed = (modulo || "").trim();
  const [permissao, setPermissao] = useState<Permissao>("none");
  const [ativo, setAtivo] = useState(false);
  const [loading, setLoading] = useState(Boolean(moduloTrimmed));

  useEffect(() => {
    let cancelled = false;

    if (!moduloTrimmed) {
      setPermissao("none");
      setAtivo(false);
      setLoading(false);
      return;
    }

    async function carregarPermissao() {
      setLoading(true);
      setPermissao("none");
      setAtivo(false);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          return;
        }

        const { data, error } = await supabase
          .from("modulo_acesso")
          .select("permissao, ativo")
          .eq("usuario_id", user.id)
          .ilike("modulo", moduloTrimmed)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Erro ao carregar permissão do módulo", moduloTrimmed, error);
          return;
        }

        const ativoValue = Boolean(data?.ativo);
        const permissaoValue = normalizePermissao(data?.permissao);
        setAtivo(ativoValue);
        setPermissao(ativoValue ? permissaoValue : "none");
      } catch (err) {
        if (!cancelled) {
          console.error("Erro ao buscar permissão do módulo", moduloTrimmed, err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    carregarPermissao();

    return () => {
      cancelled = true;
    };
  }, [moduloTrimmed]);

  const nivel = useMemo(() => permLevel(permissao), [permissao]);
  const isAdmin = permissao === "admin";

  return {
    permissao,
    ativo,
    loading,
    nivel,
    isAdmin,
    podeVer: nivel >= permLevel("view"),
    podeCriar: nivel >= permLevel("create"),
    podeEditar: nivel >= permLevel("edit"),
    podeExcluir: nivel >= permLevel("delete"),
    has: (min: Permissao) => nivel >= permLevel(min),
  };
}
