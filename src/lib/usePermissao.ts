import { useEffect, useMemo } from "react";
import { usePermissoesStore } from "./permissoesStore";
import type { Permissao } from "./permissoesCache";

export type { Permissao } from "./permissoesCache";

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

export function usePermissao(modulo: string) {
  const moduloTrimmed = (modulo || "").trim();
  const { loading: loadingPerms, ready, getPermissao, refresh } = usePermissoesStore();

  const permData = useMemo(() => {
    if (!moduloTrimmed) return null;
    return getPermissao(moduloTrimmed);
  }, [moduloTrimmed, getPermissao]);

  useEffect(() => {
    if (!moduloTrimmed) return;
    if (ready) return;
    if (loadingPerms) return;
    refresh();
  }, [moduloTrimmed, ready, loadingPerms, refresh]);

  const permissao = permData?.permissao ?? "none";
  const ativo = permData?.ativo ?? false;
  const loading = Boolean(moduloTrimmed) && (loadingPerms || (!ready && !permData));

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
