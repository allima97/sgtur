import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export type NivelPermissao =
  | "none"
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "admin";

export function usePermissao(modulo: string) {
  const [permissao, setPermissao] = useState<NivelPermissao>("none");
  const [ativo, setAtivo] = useState(true); // não bloqueia durante carregamento
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function resolveUser() {
      // tenta session primeiro (client), fallback getUser
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;
      if (sessionUser) return sessionUser;
      const { data } = await supabase.auth.getUser();
      return data?.user ?? null;
    }

    async function aplicarPermissoes() {
      try {
        const user = await resolveUser();
        if (!isMounted) return;

        if (!user) {
          setPermissao("none");
          setAtivo(false);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const uid = user.id;
        const email = (user.email || "").toLowerCase();
        const tipoMeta = (user.user_metadata as any)?.tipo || "";
        const tipoUpper = String(tipoMeta).toUpperCase();

        // ADMIN universal via metadata
        const adminMeta =
          tipoUpper.includes("ADMIN") ||
          tipoUpper.includes("ADMINISTRADOR") ||
          tipoUpper.includes("MASTER") ||
          tipoUpper.includes("SUPER");

        // ADMIN via tabela users.user_types
        let adminBD = false;
        const { data: userRow } = await supabase
          .from("users")
          .select("user_types(name)")
          .eq("id", uid)
          .maybeSingle();

        const tipoDb = Array.isArray(userRow?.user_types)
          ? (userRow.user_types[0]?.name || "").toUpperCase()
          : ((userRow as any)?.user_types?.name || "").toUpperCase();

        adminBD =
          tipoDb.includes("ADMIN") ||
          tipoDb.includes("ADMINISTRADOR") ||
          tipoDb.includes("MASTER") ||
          tipoDb.includes("SUPER");

        // super admin fixo
        const superAdmin =
          uid === "d9076aab-13c4-49d6-bc6a-ff3211009721";

        const isAdminFinal = superAdmin || adminMeta || adminBD;
        if (isAdminFinal) {
          setIsAdmin(true);
          setPermissao("admin");
          setAtivo(true);
          setLoading(false);
          return;
        }

        // Caso contrário → verifica no banco
        const { data: accList } = await supabase
          .from("modulo_acesso")
          .select("modulo, permissao, ativo")
          .eq("usuario_id", uid);

        const alvo = (accList || []).find(
          (r: any) => (r.modulo || "").toLowerCase() === modulo.toLowerCase()
        );

        if (alvo && alvo.ativo) {
          setPermissao((alvo.permissao as NivelPermissao) || "none");
          setAtivo(true);
          setIsAdmin(false);
        } else {
          setPermissao("none");
          setAtivo(false);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("[usePermissao] Erro:", error);
        if (!isMounted) return;
        setPermissao("none");
        setAtivo(false);
        setIsAdmin(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    aplicarPermissoes();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session?.user) {
        setPermissao("none");
        setAtivo(false);
        setIsAdmin(false);
        setLoading(false);
      } else {
        setLoading(true);
        aplicarPermissoes();
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [modulo]);

  return { permissao, ativo, loading, isAdmin };
}
