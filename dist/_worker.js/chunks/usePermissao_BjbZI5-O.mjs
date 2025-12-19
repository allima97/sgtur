globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as reactExports } from './_@astro-renderers_DYCwg6Ew.mjs';
import { s as supabase } from './supabase_CtqDhMax.mjs';

const permLevel = (p) => {
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
const normalizePermissao = (value) => {
  const perm = (value || "").toLowerCase();
  if (perm === "admin") return "admin";
  if (perm === "delete") return "delete";
  if (perm === "edit") return "edit";
  if (perm === "create") return "create";
  if (perm === "view") return "view";
  return "none";
};
function usePermissao(modulo) {
  const moduloTrimmed = (modulo || "").trim();
  const [permissao, setPermissao] = reactExports.useState("none");
  const [ativo, setAtivo] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(Boolean(moduloTrimmed));
  reactExports.useEffect(() => {
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
        const { data, error } = await supabase.from("modulo_acesso").select("permissao, ativo").eq("usuario_id", user.id).ilike("modulo", moduloTrimmed).maybeSingle();
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
  const nivel = reactExports.useMemo(() => permLevel(permissao), [permissao]);
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
    has: (min) => nivel >= permLevel(min)
  };
}

export { usePermissao as u };
