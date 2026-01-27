import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import { descobrirModulo } from "./config/modulos";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  const pathname = url.pathname;

  // ROTAS PUBLICAS
  const rotasPublicas = [
    "/auth/login",
    "/auth/register",
    "/auth/recover",
    "/auth/update-password",
    "/test-env",
    "/favicon",
    "/_astro",
    "/assets",
    "/public",
    "/pdfs",
  ];

  const isPublic = rotasPublicas.some((r) => pathname.startsWith(r));

  // Rotas públicas e assets não precisam de sessão (evita set-cookie após response).
  if (isPublic) return next();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "PUBLIC_SUPABASE_URL ou PUBLIC_SUPABASE_ANON_KEY ausentes. Configure as variáveis de ambiente (Pages → Settings → Environment Variables)."
    );
    return new Response(
      "Faltam PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY. Configure no Cloudflare Pages ou no .env local.",
      { status: 500 }
    );
  }

  // Criar supabase SSR
  const { cookies } = context;
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  // Verifica usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/auth/login", url), 302);
  }
  context.locals.userId = user.id;
  context.locals.userEmail = user.email ?? "";

  // ============================
  // 1) MAPEAMENTO DE ROTAS → MÓDULOS
  // ============================
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
    return Response.redirect(new URL("/negado", url), 302);
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
    return Response.redirect(new URL("/negado", url), 302);
  }

  // ADMIN → sempre permitido
  if (permissao === "admin") return next();

  // Para qualquer outra permissão (view / create / edit / delete)
  // acesso à rota é permitido, restrições de função ficam nos islands.
  return next();
});
