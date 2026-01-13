globalThis.process ??= {}; globalThis.process.env ??= {};
import { d as defineMiddleware, s as sequence } from './chunks/index_HDWYj-Kx.mjs';
import './chunks/index_CjYnf4g_.mjs';
import { c as createServerClient } from './chunks/createServerClient_BmgXZ1CZ.mjs';
import './chunks/astro-designed-error-pages_935dJdAC.mjs';
import './chunks/astro/server_C9jQHs-i.mjs';

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

const onRequest$1 = (context, next) => {
  if (context.isPrerendered) {
    context.locals.runtime ??= {
      env: process.env
    };
  }
  return next();
};

const onRequest = sequence(
	onRequest$1,
	onRequest$2
	
);

export { onRequest };
