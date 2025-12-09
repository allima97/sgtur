import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies } = context;
  const pathname = url.pathname;

  // ROTAS PUBLICAS
  const rotasPublicas = [
    "/auth/login",
    "/auth/register",
    "/auth/recover",
    "/auth/update-password",
    "/test-env",
    "/favicon",
    "/assets",
    "/public",
  ];

  const isPublic = rotasPublicas.some((r) => pathname.startsWith(r));

  // Criar supabase SSR
  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookies.get(name)?.value ?? "",
        set: (name, value, options) =>
          cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            path: "/",
          }),
        remove: (name, options) =>
          cookies.delete(name, {
            ...options,
            path: "/",
          }),
      },
    }
  );

  // Se for rota pública → libera
  if (isPublic) return next();

  // Verifica usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/auth/login", url), 302);
  }

  // ============================
  // 1) MAPEAMENTO DE ROTAS → MÓDULOS
  // ============================
  const mapaRotas: Record<string, string> = {
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/vendas": "Vendas",
    "/orcamentos": "Vendas",
    "/clientes": "Clientes",
    "/cadastros": "Cadastros",
    "/relatorios": "Relatorios",
    "/parametros": "Parametros",
    "/admin": "Admin",
    "/documentacao": "Admin",
  };

  function descobrirModulo(path: string): string | null {
    const entradas = Object.keys(mapaRotas);
    for (const p of entradas) {
      if (path.startsWith(p)) return mapaRotas[p];
    }
    return null;
  }

  const modulo = descobrirModulo(pathname);
  if (!modulo) return next(); // rota não associada a módulo

  // ============================
  // 2) PEGAR PERMISSÃO DO USUÁRIO
  // ============================
  const { data: acc } = await supabase
    .from("modulo_acesso")
    .select("permissao, ativo")
    .eq("usuario_id", user.id)
    .eq("modulo", modulo)
    .maybeSingle();

  // Sem registro → sem acesso
  if (!acc || !acc.ativo) {
    return Response.redirect(new URL("/auth/login", url), 302);
  }

  const permissao = acc.permissao as
    | "none"
    | "view"
    | "create"
    | "edit"
    | "delete"
    | "admin";

  // ============================
  // 3) VALIDAR NÍVEL DE ACESSO
  // ============================
  const nivel = ["none", "view", "create", "edit", "delete", "admin"];
  const idx = nivel.indexOf(permissao);

  if (idx < 1) {
    // none → bloqueado
    return Response.redirect(new URL("/auth/login", url), 302);
  }

  // ADMIN → sempre permitido
  if (permissao === "admin") return next();

  // Para qualquer outra permissão (view / create / edit / delete)
  // acesso à rota é permitido, restrições de função ficam nos islands.
  return next();
});
