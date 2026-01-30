import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import { descobrirModulo, MODULO_ALIASES } from "./config/modulos";
import {
  extractUserTypeName,
  isSystemAdminRole,
  normalizeUserType,
} from "./lib/adminAccess";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const MENU_CACHE_COOKIE = "sgtur_menu_cache";
const MENU_CACHE_TTL_MS = 5 * 60 * 1000;
const supabaseProjectRef =
  supabaseUrl?.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? "";
const SUPABASE_AUTH_COOKIE_NAME = supabaseProjectRef
  ? `sb-${supabaseProjectRef}-auth-token`
  : "sb-auth-token";

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

type MiddlewareCookies = {
  get: (name: string) => { value?: string } | undefined;
  delete: (name: string, options?: { path?: string; sameSite?: string; secure?: boolean }) => void;
};

const deleteCookieOptions = {
  path: "/",
  sameSite: "Lax",
  secure: true,
};

const SUPABASE_COOKIE_BASES = [SUPABASE_AUTH_COOKIE_NAME, "sb-auth-token"];

function buildExpiredCookieHeaders() {
  const headers: string[] = [];
  SUPABASE_COOKIE_BASES.forEach((base) => {
    headers.push(`${base}=; Path=/; Max-Age=0; SameSite=Lax; Secure`);
    for (let idx = 0; idx < 6; idx += 1) {
      headers.push(`${base}.${idx}=; Path=/; Max-Age=0; SameSite=Lax; Secure`);
    }
  });
  return headers;
}

function isInvalidSupabaseCookieError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as any).message ?? "").toLowerCase();
  return message.includes("base64-url") || message.includes("base64url") || message.includes("utf-8");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  const pathname = url.pathname;

  // ROTAS PUBLICAS
const rotasPublicas = [
  "/auth/login",
  "/auth/register",
  "/auth/recover",
  "/auth/reset",
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
  let supabase;
  const builderOptions = {
    cookies: {
      get: (name: string) => cookies.get(name)?.value ?? "",
      set: (name: string, value: string, options: any) =>
        cookies.set(name, value, {
          ...options,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/",
        }),
      remove: (name: string, options: any) =>
        cookies.delete(name, {
          ...options,
          path: "/",
        }),
    },
  } as const;

  try {
    supabase = createServerClient(supabaseUrl, supabaseAnonKey, builderOptions);
  } catch (error) {
    if (isInvalidSupabaseCookieError(error)) {
      const headers = buildExpiredCookieHeaders();
      return new Response(null, {
        status: 302,
        headers: [
          ["location", "/auth/login"],
          ...headers.map((value) => ["set-cookie", value]),
        ],
      });
    }
    throw error;
  }

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
  let cachedUserType = "";
  let cachedIsSystemAdmin = false;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(cookieRaw));
      if (parsed?.userId === user.id) {
        const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;
        cachedUserType = normalizeUserType(parsed?.userType);
        cachedIsSystemAdmin =
          typeof parsed?.isSystemAdmin === "boolean"
            ? parsed.isSystemAdmin
            : isSystemAdminRole(cachedUserType);
        const isFresh = updatedAt && Date.now() - updatedAt < MENU_CACHE_TTL_MS;
        const hasUserType = Boolean(cachedUserType);
        if (isFresh && hasUserType) {
          shouldRefreshMenuCache = false;
        }
      }
    } catch {
      shouldRefreshMenuCache = true;
    }
  }

  let userType = cachedUserType;
  let isSystemAdmin = cachedIsSystemAdmin;

  // Bloqueio de onboarding: exige perfil completo antes de acessar outros módulos
  const rotasOnboardingPermitidas = ["/perfil", "/auth"];

  if (shouldRefreshMenuCache) {
    const [accRowsRes, userTypeRes] = await Promise.all([
      supabase
        .from("modulo_acesso")
        .select("modulo, permissao, ativo")
        .eq("usuario_id", user.id),
      supabase
        .from("users")
        .select("id, user_types(name)")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const acessos = buildPerms(
      (accRowsRes.data || []) as Array<{
        modulo: string | null;
        permissao: string | null;
        ativo: boolean | null;
      }>
    );

    const rawType = extractUserTypeName(userTypeRes.data);
    userType = normalizeUserType(rawType);
    isSystemAdmin = isSystemAdminRole(userType);

    const payload = {
      userId: user.id,
      acessos,
      updatedAt: Date.now(),
      userEmail: user.email ?? "",
      userType,
      isSystemAdmin,
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

  if (isSystemAdmin) {
    const adminAllowedPrefixes = [
      "/dashboard/admin",
      "/dashboard/logs",
      "/dashboard/permissoes",
      "/admin",
      "/documentacao",
      "/perfil",
    ];
    const isAllowed = adminAllowedPrefixes.some((prefix) => pathname.startsWith(prefix));
    if (isAllowed) {
      return next();
    }
    return Response.redirect(new URL("/dashboard/admin", url), 302);
  }

  // Bloquear acesso até completar o onboarding (perfil obrigatório)
  const isOnboardingAllowed = rotasOnboardingPermitidas.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (!isOnboardingAllowed) {
    const { data: perfil } = await supabase
      .from("users")
      .select("nome_completo, telefone, cidade, estado, uso_individual")
      .eq("id", user.id)
      .maybeSingle();
    const precisaOnboarding =
      !perfil?.nome_completo ||
      !perfil?.telefone ||
      !perfil?.cidade ||
      !perfil?.estado ||
      perfil?.uso_individual === null ||
      perfil?.uso_individual === undefined;
    if (precisaOnboarding) {
      return Response.redirect(new URL("/perfil?onboarding=1", url), 302);
    }
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
