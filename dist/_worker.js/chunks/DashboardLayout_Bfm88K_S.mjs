globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as createAstro, f as renderHead, e as renderComponent, r as renderSlot, d as renderTemplate } from './astro/server_C6IdV9ex.mjs';
/* empty css                              */
import { s as supabase, j as jsxRuntimeExports } from './supabase_CtqDhMax.mjs';
import { r as reactExports } from './_@astro-renderers_DYCwg6Ew.mjs';
import { r as registrarLog } from './logs_D3Eb6w9w.mjs';

async function logoutUsuario() {
  try {
    const { data } = await supabase.auth.getUser();
    const usuarioId = data?.user?.id || null;
    let ip = "";
    try {
      const resp = await fetch("https://api.ipify.org?format=json");
      const j = await resp.json();
      ip = j.ip || "";
    } catch {
    }
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    await registrarLog({
      user_id: usuarioId,
      acao: "logout",
      modulo: "login",
      detalhes: {
        ip,
        userAgent
      }
    });
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  } catch (e) {
    console.error("Erro ao sair:", e);
    window.location.href = "/auth/login";
  }
}

const MAPA_MODULOS = {
  Dashboard: "dashboard",
  Vendas: "vendas_consulta",
  Orcamentos: "orcamentos",
  Clientes: "clientes",
  Cadastros: "cadastros",
  Paises: "cadastros_paises",
  Cidades: "cadastros_cidades",
  Destinos: "cadastros_destinos",
  Produtos: "cadastros_produtos",
  Relatorios: "relatorios",
  RelatorioVendas: "relatorios_vendas",
  RelatorioDestinos: "relatorios_destinos",
  RelatorioProdutos: "relatorios_produtos",
  RelatorioClientes: "relatorios_clientes",
  Parametros: "parametros",
  Metas: "parametros_metas",
  RegrasComissao: "parametros_regras_comissao",
  Admin: "admin",
  AdminDashboard: "admin_dashboard",
  AdminUsers: "admin_users",
  AdminLogs: "admin_logs"
};
function MenuIsland({ activePage }) {
  const initialCache = (() => {
    if (typeof window === "undefined") return null;
    try {
      const cache = window.localStorage.getItem("sgtur_menu_cache");
      return cache ? JSON.parse(cache) : null;
    } catch {
      return null;
    }
  })();
  const [userId, setUserId] = reactExports.useState(initialCache?.userId || null);
  const [acessos, setAcessos] = reactExports.useState(initialCache?.acessos || {});
  const [loading, setLoading] = reactExports.useState(false);
  const [cacheLoaded, setCacheLoaded] = reactExports.useState(Boolean(initialCache));
  const [saindo, setSaindo] = reactExports.useState(false);
  const [tipoUsuario, setTipoUsuario] = reactExports.useState(initialCache?.tipoUsuario || "");
  const [isAdminFinal, setIsAdminFinal] = reactExports.useState(initialCache?.isAdmin || false);
  const [userEmail, setUserEmail] = reactExports.useState(initialCache?.userEmail || "");
  async function carregar() {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    const { data: userData } = sessionUser ? { data: { user: sessionUser } } : await supabase.auth.getUser();
    const user = userData?.user || sessionUser || null;
    const uid = user?.id || null;
    const email = user?.email || "";
    const metaTipo = user?.user_metadata?.tipo || "";
    const appRoles = user?.app_metadata?.roles || [];
    const appRole = user?.app_metadata?.role || "";
    const tipoFromApp = Array.isArray(appRoles) && appRoles.length > 0 ? appRoles.join(",") : appRole;
    const tipo = [metaTipo, tipoFromApp].filter(Boolean).join(", ");
    setUserId((prev) => prev !== uid ? uid : prev);
    setTipoUsuario((prev) => prev !== String(tipo || "").toUpperCase() ? String(tipo || "").toUpperCase() : prev);
    setUserEmail((prev) => prev !== email.toLowerCase() ? email.toLowerCase() : prev);
    if (!uid) {
      if (!cacheLoaded) {
        setAcessos({});
      }
      setCacheLoaded(true);
      return;
    }
    const { data: userRow } = await supabase.from("users").select("user_types(name)").eq("id", uid).maybeSingle();
    const nomeTipoDb = userRow?.user_types?.name || "";
    const tipoDb = String(nomeTipoDb || "").toUpperCase();
    const palavrasAdmin = ["ADMIN", "ADMINISTRADOR", "SUPER", "MASTER"];
    const adminViaMetadata = palavrasAdmin.some(
      (p) => tipo.toUpperCase().includes(p)
    );
    const adminViaDB = palavrasAdmin.some(
      (p) => tipoDb.includes(p)
    );
    const isAdmin = adminViaMetadata || adminViaDB;
    setIsAdminFinal((prev) => prev !== isAdmin ? isAdmin : prev);
    const { data } = await supabase.from("modulo_acesso").select("modulo, permissao, ativo").eq("usuario_id", uid);
    const perms = {};
    (data || []).forEach((r) => {
      const moduloTexto = r.modulo.toLowerCase();
      const permTexto = (r.permissao || "none").toLowerCase();
      const permVal = ["view", "create", "edit", "delete", "admin"].includes(permTexto) ? permTexto : permTexto === "none" ? "none" : "view";
      perms[moduloTexto] = r.ativo ? permVal : "none";
    });
    setAcessos((prev) => {
      const prevStr = JSON.stringify(prev);
      const nextStr = JSON.stringify(perms);
      return prevStr !== nextStr ? perms : prev;
    });
    try {
      window.localStorage.setItem(
        "sgtur_menu_cache",
        JSON.stringify({
          userId: uid,
          acessos: perms,
          isAdmin,
          tipoUsuario: String(tipo || "").toUpperCase(),
          userEmail: email.toLowerCase()
        })
      );
    } catch {
    }
    setCacheLoaded(true);
  }
  reactExports.useEffect(() => {
    try {
      const cache = window.localStorage.getItem("sgtur_menu_cache");
      if (cache) {
        const parsed = JSON.parse(cache);
        setUserId(parsed.userId || null);
        setAcessos(parsed.acessos || {});
        setIsAdminFinal(!!parsed.isAdmin);
        setTipoUsuario(parsed.tipoUsuario || "");
        setUserEmail(parsed.userEmail || "");
        setCacheLoaded(true);
      }
    } catch {
    }
    carregar();
  }, []);
  async function handleLogout() {
    setSaindo(true);
    await logoutUsuario();
    setSaindo(false);
  }
  const pode = (moduloBD, min = "view") => {
    const niveis = ["none", "view", "create", "edit", "delete", "admin"];
    const p = acessos[moduloBD] ?? "none";
    return niveis.indexOf(p) >= niveis.indexOf(min);
  };
  const can = (mod, min = "view") => {
    if (isAdminFinal) return true;
    const modBD = MAPA_MODULOS[mod];
    if (!modBD) return false;
    return pode(modBD, min);
  };
  const isAdminMenu = isAdminFinal;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "app-sidebar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-logo", children: "SGTUR" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-section-title", children: "Operação" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "sidebar-nav", children: [
        can("Dashboard") && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "dashboard" ? "active" : ""}`,
            href: "/",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "📊" }),
              "Dashboard"
            ]
          }
        ) }),
        can("Vendas") && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "vendas" ? "active" : ""}`,
            href: "/vendas/consulta",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🧾" }),
              "Vendas"
            ]
          }
        ) }),
        can("Orcamentos") && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "orcamentos" ? "active" : ""}`,
            href: "/orcamentos",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "💼" }),
              "Orçamentos"
            ]
          }
        ) }),
        can("Clientes") && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "clientes" ? "active" : ""}`,
            href: "/clientes/carteira",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "👥" }),
              "Clientes"
            ]
          }
        ) })
      ] })
    ] }),
    can("Cadastros") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-section-title", children: "Cadastros" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "sidebar-nav", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "paises" ? "active" : ""}`,
            href: "/cadastros/paises",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🌍" }),
              "Países"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "cidades" ? "active" : ""}`,
            href: "/cadastros/cidades",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🏙️" }),
              "Cidades"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "destinos" ? "active" : ""}`,
            href: "/cadastros/destinos",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "📌" }),
              "Destinos"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "produtos" ? "active" : ""}`,
            href: "/cadastros/produtos",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🎫" }),
              "Produtos"
            ]
          }
        ) })
      ] })
    ] }),
    can("Relatorios") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-section-title", children: "Relatórios" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "sidebar-nav", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "relatorios-vendas" ? "active" : ""}`,
            href: "/relatorios/vendas",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "📈" }),
              "Vendas (detalhado)"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "relatorios-vendas-destino" ? "active" : ""}`,
            href: "/relatorios/vendas-por-destino",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "📌" }),
              "Vendas por destino"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "relatorios-vendas-produto" ? "active" : ""}`,
            href: "/relatorios/vendas-por-produto",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🎫" }),
              "Vendas por produto"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "relatorios-vendas-cliente" ? "active" : ""}`,
            href: "/relatorios/vendas-por-cliente",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "👤" }),
              "Vendas por cliente"
            ]
          }
        ) })
      ] })
    ] }),
    can("Parametros") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-section-title", children: "Parâmetros" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "sidebar-nav", children: [
        can("Metas") && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "parametros-metas" ? "active" : ""}`,
            href: "/parametros/metas",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🎯" }),
              "Metas"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "parametros" ? "active" : ""}`,
            href: "/parametros",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "⚙️" }),
              "Parâmetros do Sistema"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "regras-comissao" ? "active" : ""}`,
            href: "/parametros/regras-comissao",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "💰" }),
              "Regras de Comissão"
            ]
          }
        ) })
      ] })
    ] }),
    userId && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-section-title", children: "Conta" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "sidebar-nav", children: /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "a",
        {
          className: `sidebar-link ${activePage === "perfil" ? "active" : ""}`,
          href: "/perfil",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "👤" }),
            "Perfil"
          ]
        }
      ) }) })
    ] }),
    isAdminMenu && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-section-title", children: "Administração" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "sidebar-nav", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "admin-permissoes" ? "active" : ""}`,
            href: "/admin/permissoes",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "⚙️" }),
              "Permissões"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "admin-logs" ? "active" : ""}`,
            href: "/dashboard/logs",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "📜" }),
              "Logs"
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            className: `sidebar-link ${activePage === "admin-users" ? "active" : ""}`,
            href: "/dashboard/admin",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🧑‍💼" }),
              "Usuários"
            ]
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "sidebar-nav", children: /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: "sidebar-link",
        style: {
          background: "transparent",
          border: "none",
          width: "100%",
          textAlign: "left"
        },
        onClick: handleLogout,
        disabled: saindo,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🚪" }),
          saindo ? "Saindo..." : "Sair"
        ]
      }
    ) }) }) })
  ] });
}

const $$Astro = createAstro();
const $$DashboardLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$DashboardLayout;
  const { title = "SGTUR", activePage = "" } = Astro2.props;
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="utf-8"><title>${title}</title>${renderHead()}</head> <body> <div class="app-shell"> <!-- MENU DINÂMICO --> ${renderComponent($$result, "MenuIsland", MenuIsland, { "client:load": true, "activePage": activePage, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgt-astro/src/components/islands/MenuIsland.tsx", "client:component-export": "default" })} <!-- CONTEÚDO --> <main class="app-main"> ${renderSlot($$result, $$slots["default"])} </main> </div> </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgt-astro/src/layouts/DashboardLayout.astro", void 0);

export { $$DashboardLayout as $ };
