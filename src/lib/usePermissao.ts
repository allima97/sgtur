import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import {
  ensurePermissoes,
  getPermissaoFromCache,
  readPermissoesCache,
  subscribePermissoes,
} from "./permissoesCache";
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
    let resolved = false;
    let unsubscribe: (() => void) | null = null;

    if (!moduloTrimmed) {
      setPermissao("none");
      setAtivo(false);
      setLoading(false);
      return;
    }

    async function carregarPermissao() {
      setLoading(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          if (!cancelled) {
            setPermissao("none");
            setAtivo(false);
            setLoading(false);
          }
          return;
        }

        const finalizar = () => {
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        };

        const aplicarPermissao = (permData: { permissao: Permissao; ativo: boolean }) => {
          if (cancelled || resolved) return;
          resolved = true;
          setPermissao(permData.permissao);
          setAtivo(permData.ativo);
          setLoading(false);
          finalizar();
        };

        const aplicarNenhuma = () => {
          if (cancelled || resolved) return;
          resolved = true;
          setPermissao("none");
          setAtivo(false);
          setLoading(false);
          finalizar();
        };

        const cacheAtual = readPermissoesCache();
        const cachedPerm = getPermissaoFromCache(moduloTrimmed, user.id, cacheAtual);
        if (cachedPerm) {
          aplicarPermissao(cachedPerm);
          return;
        }

        unsubscribe = subscribePermissoes((cache) => {
          if (cancelled || resolved || cache.userId !== user.id) return;
          const permFromCache = getPermissaoFromCache(moduloTrimmed, user.id, cache);
          if (permFromCache) {
            aplicarPermissao(permFromCache);
          }
        });

        const ensuredCache = await ensurePermissoes(user.id, user.email);
        if (cancelled || resolved) return;

        if (ensuredCache && ensuredCache.userId === user.id) {
          const ensuredPerm = getPermissaoFromCache(moduloTrimmed, user.id, ensuredCache);
          if (ensuredPerm) {
            aplicarPermissao(ensuredPerm);
          } else {
            aplicarNenhuma();
          }
          return;
        }

        if (!cancelled) {
          setPermissao("none");
          setAtivo(false);
        }

        const { data, error } = await supabase
          .from("modulo_acesso")
          .select("permissao, ativo")
          .eq("usuario_id", user.id)
          .ilike("modulo", moduloTrimmed);

        if (cancelled || resolved) return;

        if (error) {
          console.error("Erro ao carregar permissao do modulo", moduloTrimmed, error);
          return;
        }

        const registros = (data || []) as { permissao: string | null; ativo: boolean | null }[];
        let melhorRegistro: { permissao: string | null; ativo: boolean | null } | null = null;

        for (const registro of registros) {
          if (!melhorRegistro) {
            melhorRegistro = registro;
            continue;
          }

          const atualAtivo = Boolean(registro.ativo);
          const melhorAtivo = Boolean(melhorRegistro.ativo);

          if (atualAtivo !== melhorAtivo) {
            if (atualAtivo) melhorRegistro = registro;
            continue;
          }

          const nivelAtual = permLevel(normalizePermissao(registro.permissao));
          const nivelMelhor = permLevel(normalizePermissao(melhorRegistro.permissao));

          if (nivelAtual > nivelMelhor) {
            melhorRegistro = registro;
          }
        }

        if (!melhorRegistro) {
          aplicarNenhuma();
          return;
        }

        const ativoValue = Boolean(melhorRegistro.ativo);
        const permissaoValue = normalizePermissao(melhorRegistro.permissao);
        aplicarPermissao({
          permissao: ativoValue ? permissaoValue : "none",
          ativo: ativoValue,
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Erro ao buscar permissao do modulo", moduloTrimmed, err);
        }
      } finally {
        if (!cancelled && !resolved) {
          setLoading(false);
        }
      }
    }

    carregarPermissao();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
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
