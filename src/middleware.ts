import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import { descobrirModulo, MODULO_ALIASES } from "./config/modulos";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const MENU_CACHE_COOKIE = "sgtur_menu_cache";
const MENU_CACHE_TTL_MS = 5 * 60 * 1000;

const permLevel = (p?: string | null): number => {
  switch ((p || "").toLowerCase()) {
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

const normalizePermissao = (value?: string | null) => {
  const perm = (value || "").toLowerCase();
  if (perm === "admin") return "admin";
  if (perm === "delete") return "delete";
  if (perm === "edit") return "edit";
  if (perm === "create") return "create";
  if (perm === "view") return "view";
  return "none";
};

const setPerm = (perms: Record<string, string>, key: string, perm: string) => {
  if (!key) return;
  const normalizedKey = key.toLowerCase();
  const atual = perms[normalizedKey] ?? "none";
  perms[normalizedKey] = permLevel(perm) > permLevel(atual) ? perm : atual;
};

const buildPerms = (
  rows: Array<{ modulo: string | null; permissao: string | null; ativo: boolean | null }>
) => {
  const perms: Record<string, string> = {};
  rows.forEach((registro) => {
    const modulo = String(registro.modulo || "").toLowerCase();
    if (!modulo) return;
    const permissaoNormalizada = normalizePermissao(registro.permissao);
    const finalPerm = registro.ativo ? permissaoNormalizada : "none";
    setPerm(perms, modulo, finalPerm);
    const alias = MODULO_ALIASES[modulo];
    if (alias) setPerm(perms, alias, finalPerm);
  });
  return perms;
};

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

  const cookieRaw = context.cookies.get(MENU_CACHE_COOKIE)?.value ?? "";
  let shouldRefreshMenuCache = true;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(cookieRaw));
      if (parsed?.userId === user.id) {
        const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
        if (updatedAt && Date.now() - updatedAt < MENU_CACHE_TTL_MS) {
          shouldRefreshMenuCache = false;
        }
      }
    } catch {
      shouldRefreshMenuCache = true;
    }
  }

  if (shouldRefreshMenuCache) {
    const { data: accRows } = await supabase
      .from("modulo_acesso")
      .select("modulo, permissao, ativo")
      .eq("usuario_id", user.id);

    const acessos = buildPerms((accRows || []) as Array<{ modulo: string | null; permissao: string | null; ativo: boolean | null }>);
    const payload = {
      userId: user.id,
      acessos,
      updatedAt: Date.now(),
      userEmail: user.email ?? "",
    };
    try {
      const encoded = encodeURIComponent(JSON.stringify(payload));
      context.cookies.set(MENU_CACHE_COOKIE, encoded, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "Lax",
        secure: true,
      });
    } catch {}
  }

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
