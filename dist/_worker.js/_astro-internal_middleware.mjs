globalThis.process ??= {}; globalThis.process.env ??= {};
import { d as defineMiddleware, s as sequence } from './chunks/index_uRyuiMeZ.mjs';
import { c as createStorageFromOptions, m as memoryLocalStorageAdapter, V as VERSION, a as applyServerStorage } from './chunks/index_j26q7bMs.mjs';
import { c as createClient } from './chunks/wrapper_6q0T_V9b.mjs';
import './chunks/astro-designed-error-pages_B9tnExSv.mjs';

function createServerClient(supabaseUrl, supabaseKey, options) {
    const { storage, getAll, setAll, setItems, removedItems } = createStorageFromOptions({
        ...options,
        cookieEncoding: options?.cookieEncoding ?? "base64url",
    }, true);
    const client = createClient(supabaseUrl, supabaseKey, {
        // TODO: resolve type error
        ...options,
        global: {
            ...options?.global,
            headers: {
                ...options?.global?.headers,
                "X-Client-Info": `supabase-ssr/${VERSION} createServerClient`,
            },
        },
        auth: {
            ...(options?.cookieOptions?.name
                ? { storageKey: options.cookieOptions.name }
                : null),
            ...options?.auth,
            flowType: "pkce",
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: true,
            storage,
            ...(options?.cookies &&
                "encode" in options.cookies &&
                options.cookies.encode === "tokens-only"
                ? {
                    userStorage: options?.auth?.userStorage ?? memoryLocalStorageAdapter(),
                }
                : null),
        },
    });
    client.auth.onAuthStateChange(async (event) => {
        // The SIGNED_IN event is fired very often, but we don't need to
        // apply the storage each time it fires, only if there are changes
        // that need to be set -- which is if setItems / removeItems have
        // data.
        const hasStorageChanges = Object.keys(setItems).length > 0 || Object.keys(removedItems).length > 0;
        if (hasStorageChanges &&
            (event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "USER_UPDATED" ||
                event === "PASSWORD_RECOVERY" ||
                event === "SIGNED_OUT" ||
                event === "MFA_CHALLENGE_VERIFIED")) {
            await applyServerStorage({ getAll, setAll, setItems, removedItems }, {
                cookieOptions: options?.cookieOptions ?? null,
                cookieEncoding: options?.cookieEncoding ?? "base64url",
            });
        }
    });
    return client;
}

const supabaseUrl = "https://ggqmvruerbaqxthhnxrm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncW12cnVlcmJhcXh0aGhueHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjM0NzgsImV4cCI6MjA4MDMzOTQ3OH0.W3msgFUJMFSMOmAuvmI4QE3azppGYPdzGRZcfe9c9Bc";
const onRequest$2 = defineMiddleware(async (context, next) => {
  const { url, cookies } = context;
  const pathname = url.pathname;
  const rotasPublicas = [
    "/auth/login",
    "/auth/register",
    "/auth/recover",
    "/auth/update-password",
    "/test-env",
    "/favicon",
    "/assets",
    "/public",
    "/pdfs"
  ];
  const isPublic = rotasPublicas.some((r) => pathname.startsWith(r));
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name) => cookies.get(name)?.value ?? "",
        set: (name, value, options) => cookies.set(name, value, {
          ...options,
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/"
        }),
        remove: (name, options) => cookies.delete(name, {
          ...options,
          path: "/"
        })
      }
    }
  );
  if (isPublic) return next();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.redirect(new URL("/auth/login", url), 302);
  }
  const mapaRotas = {
    "/dashboard/logs": "Admin",
    "/dashboard/admin": "Admin",
    "/dashboard/permissoes": "Admin",
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/vendas": "Vendas",
    "/orcamentos": "Vendas",
    "/clientes": "Clientes",
    "/cadastros": "Cadastros",
    "/relatorios": "Relatorios",
    "/parametros": "Parametros",
    "/admin": "Admin",
    "/documentacao": "Admin"
  };
  function descobrirModulo(path) {
    const entradas = Object.keys(mapaRotas);
    for (const p of entradas) {
      if (path.startsWith(p)) return mapaRotas[p];
    }
    return null;
  }
  const modulo = descobrirModulo(pathname);
  if (!modulo) return next();
  const { data: acc } = await supabase.from("modulo_acesso").select("permissao, ativo").eq("usuario_id", user.id).eq("modulo", modulo).maybeSingle();
  if (!acc || !acc.ativo) {
    return Response.redirect(new URL("/auth/login", url), 302);
  }
  const permissao = acc.permissao;
  const nivel = ["none", "view", "create", "edit", "delete", "admin"];
  const idx = nivel.indexOf(permissao);
  if (idx < 1) {
    return Response.redirect(new URL("/auth/login", url), 302);
  }
  if (permissao === "admin") return next();
  return next();
});

const When = {
                	Client: 'client',
                	Server: 'server',
                	Prerender: 'prerender',
                	StaticBuild: 'staticBuild',
                	DevServer: 'devServer',
              	};
            	
              const isBuildContext = Symbol.for('astro:when/buildContext');
              const whenAmI = globalThis[isBuildContext] ? When.Prerender : When.Server;

const middlewares = {
  [When.Client]: () => {
    throw new Error("Client should not run a middleware!");
  },
  [When.DevServer]: (_, next) => next(),
  [When.Server]: (_, next) => next(),
  [When.Prerender]: (ctx, next) => {
    if (ctx.locals.runtime === void 0) {
      ctx.locals.runtime = {
        env: process.env
      };
    }
    return next();
  },
  [When.StaticBuild]: (_, next) => next()
};
const onRequest$1 = middlewares[whenAmI];

const onRequest = sequence(
	onRequest$1,
	onRequest$2
	
);

export { onRequest };
