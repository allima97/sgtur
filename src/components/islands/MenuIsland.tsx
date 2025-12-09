import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { logoutUsuario } from "../../lib/logout";

type NivelPermissao =
  | "none"
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "admin";

type RegistroAcesso = {
  modulo: string;
  permissao: NivelPermissao;
  ativo: boolean;
};

// ----------------------
// MAPA REAL DOS MÓDULOS
// ----------------------
const MAPA_MODULOS: Record<string, string> = {
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

export default function MenuIsland({ activePage }) {
  const initialCache = (() => {
    if (typeof window === "undefined") return null;
    try {
      const cache = window.localStorage.getItem("sgtur_menu_cache");
      return cache ? JSON.parse(cache) : null;
    } catch {
      return null;
    }
  })();

  const [userId, setUserId] = useState<string | null>(initialCache?.userId || null);
  const [acessos, setAcessos] = useState<Record<string, NivelPermissao>>(initialCache?.acessos || {});
  // loading não derruba o menu; cache evita piscada
  const [loading, setLoading] = useState(false);
  const [cacheLoaded, setCacheLoaded] = useState(Boolean(initialCache));
  const [saindo, setSaindo] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<string>(initialCache?.tipoUsuario || "");
  const [isAdminFinal, setIsAdminFinal] = useState(initialCache?.isAdmin || false);
  const [userEmail, setUserEmail] = useState<string>(initialCache?.userEmail || "");

  async function carregar() {
    // Busca sessão primeiro para evitar estado "vazio" enquanto o supabase inicializa
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    const { data: userData } = sessionUser ? { data: { user: sessionUser } } : await supabase.auth.getUser();
    const user = userData?.user || sessionUser || null;

    const uid = user?.id || null;
    const email = user?.email || "";
    const metaTipo = (user?.user_metadata as any)?.tipo || "";
    const appRoles = (user?.app_metadata as any)?.roles || [];
    const appRole = (user?.app_metadata as any)?.role || "";

    const tipoFromApp =
      Array.isArray(appRoles) && appRoles.length > 0
        ? appRoles.join(",")
        : appRole;

    const tipo = [metaTipo, tipoFromApp].filter(Boolean).join(", ");
    // Só atualiza se mudou de fato
    setUserId((prev) => prev !== uid ? uid : prev);
    setTipoUsuario((prev) => prev !== String(tipo || "").toUpperCase() ? String(tipo || "").toUpperCase() : prev);
    setUserEmail((prev) => prev !== email.toLowerCase() ? email.toLowerCase() : prev);

    // Se não há usuário logado, mantém menu anterior (se cache existe) para evitar piscada
    if (!uid) {
      if (!cacheLoaded) {
        setAcessos({});
      }
      setCacheLoaded(true);
      return;
    }

    // ---------------------------
    // ADMIN VIA BANCO — user_types
    // ---------------------------
    const { data: userRow } = await supabase
      .from("users")
      .select("user_types(name)")
      .eq("id", uid)
      .maybeSingle();

    const nomeTipoDb =
      ((userRow as any)?.user_types as any)?.name || "";
    const tipoDb = String(nomeTipoDb || "").toUpperCase();

    // ---------------------------
    // DETECÇÃO UNIVERSAL DE ADMIN
    // ---------------------------
    const palavrasAdmin = ["ADMIN", "ADMINISTRADOR", "SUPER", "MASTER"];

    const adminViaMetadata = palavrasAdmin.some((p) =>
      tipo.toUpperCase().includes(p)
    );

    const adminViaDB = palavrasAdmin.some((p) =>
      tipoDb.includes(p)
    );

    const isAdmin = adminViaMetadata || adminViaDB;

    setIsAdminFinal((prev) => prev !== isAdmin ? isAdmin : prev);

    // ---------------------------
    // PERMISSÕES DO USUÁRIO
    // ---------------------------
    const { data } = await supabase
      .from("modulo_acesso")
      .select("modulo, permissao, ativo")
      .eq("usuario_id", uid);

    const perms: Record<string, NivelPermissao> = {};

    (data || []).forEach((r: RegistroAcesso) => {
      const moduloTexto = r.modulo.toLowerCase();
      const permTexto = (r.permissao || "none").toLowerCase();

      const permVal: NivelPermissao =
        ["view", "create", "edit", "delete", "admin"].includes(permTexto)
          ? (permTexto as NivelPermissao)
          : permTexto === "none"
          ? "none"
          : "view";

      perms[moduloTexto] = r.ativo ? permVal : "none";
    });

    // Só atualiza acessos se mudou
    setAcessos((prev) => {
      const prevStr = JSON.stringify(prev);
      const nextStr = JSON.stringify(perms);
      return prevStr !== nextStr ? perms : prev;
    });
    // cache no localStorage para não apagar o menu em navegações rápidas
    try {
      window.localStorage.setItem(
        "sgtur_menu_cache",
        JSON.stringify({
          userId: uid,
          acessos: perms,
          isAdmin: isAdmin,
          tipoUsuario: String(tipo || "").toUpperCase(),
          userEmail: email.toLowerCase(),
        })
      );
    } catch {}
    setCacheLoaded(true);
  }

  useEffect(() => {
    // tenta ler cache para não piscar menu
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
    } catch {}
    // Chama carregar, mas não mostra loading se já tem cache
    carregar();
  }, []);

  async function handleLogout() {
    setSaindo(true);
    await logoutUsuario();
    setSaindo(false);
  }

  // ---------------------------
  // Função pode()
  // ---------------------------
  const pode = (moduloBD: string, min: NivelPermissao = "view") => {
    const niveis = ["none", "view", "create", "edit", "delete", "admin"];
    const p = acessos[moduloBD] ?? "none";
    return niveis.indexOf(p) >= niveis.indexOf(min);
  };

  // ---------------------------
  // Função can() corrigida
  // ---------------------------
  const can = (mod: string, min: NivelPermissao = "view") => {
    if (isAdminFinal) return true;

    const modBD = MAPA_MODULOS[mod];
    if (!modBD) return false;

    return pode(modBD, min);
  };

  const isAdminMenu = isAdminFinal;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">SGTUR</div>

      {/* DEBUG opcional — pode remover */}
      {/* <div style={{color:"red",fontSize:12,padding:10}}>
        Email: {userEmail}<br />
        Tipo: {tipoUsuario}<br />
        Admin: {String(isAdminFinal)}
      </div> */}

      {/* OPERACAO */}
      <div>
        <div className="sidebar-section-title">Operação</div>
        <ul className="sidebar-nav">

          {can("Dashboard") && (
            <li>
              <a
                className={`sidebar-link ${activePage === "dashboard" ? "active" : ""}`}
                href="/"
              >
                <span>📊</span>Dashboard
              </a>
            </li>
          )}

          {can("Vendas") && (
            <li>
              <a
                className={`sidebar-link ${activePage === "vendas" ? "active" : ""}`}
                href="/vendas/consulta"
              >
                <span>🧾</span>Vendas
              </a>
            </li>
          )}

          {can("Orcamentos") && (
            <li>
              <a
                className={`sidebar-link ${activePage === "orcamentos" ? "active" : ""}`}
                href="/orcamentos"
              >
                <span>💼</span>Orçamentos
              </a>
            </li>
          )}

          {can("Clientes") && (
            <li>
              <a
                className={`sidebar-link ${activePage === "clientes" ? "active" : ""}`}
                href="/clientes/carteira"
              >
                <span>👥</span>Clientes
              </a>
            </li>
          )}
        </ul>
      </div>

      {/* CADASTROS */}
      {can("Cadastros") && (
        <div>
          <div className="sidebar-section-title">Cadastros</div>
          <ul className="sidebar-nav">

            <li>
              <a
                className={`sidebar-link ${activePage === "paises" ? "active" : ""}`}
                href="/cadastros/paises"
              >
                <span>🌍</span>Países
              </a>
            </li>

            <li>
              <a
                className={`sidebar-link ${activePage === "cidades" ? "active" : ""}`}
                href="/cadastros/cidades"
              >
                <span>🏙️</span>Cidades
              </a>
            </li>

            <li>
              <a
                className={`sidebar-link ${activePage === "destinos" ? "active" : ""}`}
                href="/cadastros/destinos"
              >
                <span>📌</span>Destinos
              </a>
            </li>

            <li>
              <a
                className={`sidebar-link ${activePage === "produtos" ? "active" : ""}`}
                href="/cadastros/produtos"
              >
                <span>🎫</span>Produtos
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* RELATORIOS */}
      {can("Relatorios") && (
        <div>
          <div className="sidebar-section-title">Relatórios</div>
          <ul className="sidebar-nav">
            <li>
              <a
                className={`sidebar-link ${activePage === "relatorios-vendas" ? "active" : ""}`}
                href="/relatorios/vendas"
              >
                <span>📈</span>Vendas (detalhado)
              </a>
            </li>
            <li>
              <a
                className={`sidebar-link ${activePage === "relatorios-vendas-destino" ? "active" : ""}`}
                href="/relatorios/vendas-por-destino"
              >
                <span>📌</span>Vendas por destino
              </a>
            </li>
            <li>
              <a
                className={`sidebar-link ${activePage === "relatorios-vendas-produto" ? "active" : ""}`}
                href="/relatorios/vendas-por-produto"
              >
                <span>🎫</span>Vendas por produto
              </a>
            </li>
            <li>
              <a
                className={`sidebar-link ${activePage === "relatorios-vendas-cliente" ? "active" : ""}`}
                href="/relatorios/vendas-por-cliente"
              >
                <span>👤</span>Vendas por cliente
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* PARAMETROS */}
      {can("Parametros") && (
        <div>
          <div className="sidebar-section-title">Parâmetros</div>
          <ul className="sidebar-nav">
            {can("Metas") && (
              <li>
                <a
                  className={`sidebar-link ${activePage === "parametros-metas" ? "active" : ""}`}
                  href="/parametros/metas"
                >
                  <span>🎯</span>Metas
                </a>
              </li>
            )}
            <li>
              <a
                className={`sidebar-link ${activePage === "parametros" ? "active" : ""}`}
                href="/parametros"
              >
                <span>⚙️</span>Parâmetros do Sistema
              </a>
            </li>
            <li>
              <a
                className={`sidebar-link ${activePage === "regras-comissao" ? "active" : ""}`}
                href="/parametros/regras-comissao"
              >
                <span>💰</span>Regras de Comissão
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* PERFIL */}
      {userId && (
        <div>
          <div className="sidebar-section-title">Conta</div>
          <ul className="sidebar-nav">
            <li>
              <a
                className={`sidebar-link ${activePage === "perfil" ? "active" : ""}`}
                href="/perfil"
              >
                <span>👤</span>Perfil
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* ADMIN */}
      {isAdminMenu && (
        <div>
          <div className="sidebar-section-title">Administração</div>
          <ul className="sidebar-nav">
            <li>
              <a
                className={`sidebar-link ${activePage === "admin-permissoes" ? "active" : ""}`}
                href="/admin/permissoes"
              >
                <span>⚙️</span>Permissões
              </a>
            </li>
            <li>
              <a
                className={`sidebar-link ${activePage === "admin-logs" ? "active" : ""}`}
                href="/dashboard/logs"
              >
                <span>📜</span>Logs
              </a>
            </li>
            <li>
              <a
                className={`sidebar-link ${activePage === "admin-users" ? "active" : ""}`}
                href="/dashboard/admin"
              >
                <span>🧑‍💼</span>Usuários
              </a>
            </li>
          </ul>
        </div>
      )}

      {/* LOGOUT */}
      <div style={{ marginTop: 20 }}>
        <ul className="sidebar-nav">
          <li>
            <button
              type="button"
              className="sidebar-link"
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
              }}
              onClick={handleLogout}
              disabled={saindo}
            >
              <span>🚪</span>
              {saindo ? "Saindo..." : "Sair"}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
