import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
// (IMPORTANTE: tem que bater com modulo_acesso.modulo)
// ----------------------
const MAPA_MODULOS: Record<string, string> = {
  Dashboard: "dashboard",
  Vendas: "vendas_consulta",
  Orcamentos: "orcamentos",
  Clientes: "clientes",

  Cadastros: "cadastros",
  Paises: "cadastros_paises",
  Subdivisoes: "cadastros_estados",
  Cidades: "cadastros_cidades",
  Destinos: "cadastros_destinos",
  Produtos: "cadastros_produtos",
  Fornecedores: "cadastros_fornecedores",

  Relatorios: "relatorios",
  RelatorioVendas: "relatorios_vendas",
  RelatorioDestinos: "relatorios_destinos",
  RelatorioProdutos: "relatorios_produtos",
  RelatorioClientes: "relatorios_clientes",

  Parametros: "parametros",
  TipoProdutos: "parametros_tipo_produtos",
  Metas: "parametros_metas",
  RegrasComissao: "parametros_regras_comissao",

  Admin: "admin",
  AdminDashboard: "admin_dashboard",
  AdminUsers: "admin_users",
  AdminLogs: "admin_logs",

  Operacao: "operacao",
  Viagens: "operacao_viagens",
  Comissionamento: "comissionamento",
};

// hierarquia igual ao SQL perm_level()
const permLevel = (p: NivelPermissao | undefined) => {
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

export default function MenuIsland({ activePage }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [acessos, setAcessos] = useState<Record<string, NivelPermissao>>({});
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin FINAL vindo do MESMO lugar do RLS (modulo_acesso)
  const isAdminFinal = Object.values(acessos).some((p) => p === "admin");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMobileOpen(false);
    };

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) closeMobile();
  };

  // monta mapa {modulo: permissao} pegando SEMPRE a maior permissão se houver duplicata
  function mergePerm(perms: Record<string, NivelPermissao>, modulo: string, perm: NivelPermissao) {
    const atual = perms[modulo] ?? "none";
    perms[modulo] = permLevel(perm) > permLevel(atual) ? perm : atual;
  }

  async function carregar() {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    const { data: userData } = sessionUser
      ? { data: { user: sessionUser } }
      : await supabase.auth.getUser();

    const user = userData?.user || sessionUser || null;

    const uid = user?.id || null;
    const email = user?.email || "";

    setUserId((prev) => (prev !== uid ? uid : prev));
    setUserEmail((prev) => (prev !== email.toLowerCase() ? email.toLowerCase() : prev));

    if (!uid) {
      if (!cacheLoaded) setAcessos({});
      setCacheLoaded(true);
      return;
    }

    // ✅ Fonte única: permissões do usuário (modulo_acesso)
    const { data, error } = await supabase
      .from("modulo_acesso")
      .select("modulo, permissao, ativo")
      .eq("usuario_id", uid);

    if (error) {
      // se RLS negar, mantém cache e não zera menu
      setCacheLoaded(true);
      return;
    }

    const perms: Record<string, NivelPermissao> = {};

    (data || []).forEach((r: RegistroAcesso) => {
      const modulo = String(r.modulo || "").toLowerCase();
      const perm = String(r.permissao || "none").toLowerCase();

      const permVal: NivelPermissao =
        perm === "admin" || perm === "delete" || perm === "edit" || perm === "create" || perm === "view"
          ? (perm as NivelPermissao)
          : "none";

      const finalPerm = r.ativo ? permVal : "none";
      if (modulo) mergePerm(perms, modulo, finalPerm);
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
          userEmail: email.toLowerCase(),
        })
      );
    } catch {}

    setCacheLoaded(true);
  }

  useEffect(() => {
    try {
      const cache = window.localStorage.getItem("sgtur_menu_cache");
      if (cache) {
        const parsed = JSON.parse(cache);
        setUserId(parsed.userId || null);
        setAcessos(parsed.acessos || {});
        setUserEmail(parsed.userEmail || "");
      }
    } catch {}
    setCacheLoaded(true);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    setSaindo(true);
    closeMobile();
    await logoutUsuario();
    setSaindo(false);
  }

  // verifica permissão mínima no módulo (string já do banco)
  const pode = (moduloBD: string, min: NivelPermissao = "view") => {
    const p = acessos[String(moduloBD || "").toLowerCase()] ?? "none";
    return permLevel(p) >= permLevel(min);
  };

  // verifica permissão usando o "nome humano" do MAPA_MODULOS
  const can = (mod: string, min: NivelPermissao = "view") => {
    if (isAdminFinal) return true;
    const modBD = MAPA_MODULOS[mod];
    if (!modBD) return false;
    return pode(modBD, min);
  };

  const sidebarId = "app-sidebar";

  const mobileControls = mounted
    ? createPortal(
        <>
          <button
            type="button"
            className="sidebar-mobile-trigger"
            aria-expanded={mobileOpen}
            aria-controls={sidebarId}
            onClick={toggleMobile}
          >
            <span className="sidebar-mobile-icon">{mobileOpen ? "✕" : "☰"}</span>
            <span>{mobileOpen ? "Fechar" : "Menu"}</span>
          </button>
          <div className={`sidebar-overlay ${mobileOpen ? "visible" : ""}`} onClick={closeMobile} />
        </>,
        document.body
      )
    : null;

  return (
    <>
      {mobileControls}
      <aside id={sidebarId} className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-logo">SGTUR</div>

        {/* OPERACAO */}
        <div>
          <div className="sidebar-section-title">Operação</div>
          <ul className="sidebar-nav">
            {can("Dashboard") && (
              <li>
                <a
                  className={`sidebar-link ${activePage === "dashboard" ? "active" : ""}`}
                  href="/"
                  onClick={handleNavClick}
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
                  onClick={handleNavClick}
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
                  onClick={handleNavClick}
                >
                  <span>💼</span>Orçamentos
                </a>
              </li>
            )}

            {can("Comissionamento") && (
              <li>
                <a
                  className={`sidebar-link ${activePage === "comissionamento" ? "active" : ""}`}
                  href="/operacao/comissionamento"
                  onClick={handleNavClick}
                >
                  <span>💰</span>Comissionamento
                </a>
              </li>
            )}

            {can("Operacao") && (
              <li>
                <a
                  className={`sidebar-link ${activePage === "operacao_viagens" ? "active" : ""}`}
                  href="/operacao/viagens"
                  onClick={handleNavClick}
                >
                  <span>✈️</span>Viagens
                </a>
              </li>
            )}

            {isAdminFinal && (
              <li>
                <a
                  className={`sidebar-link ${activePage === "importar-vendas" ? "active" : ""}`}
                  href="/gestor/importar-vendas"
                  onClick={handleNavClick}
                >
                  <span>⬆️</span>Importar Vendas
                </a>
              </li>
            )}

            {can("Clientes") && (
              <li>
                <a
                  className={`sidebar-link ${activePage === "clientes" ? "active" : ""}`}
                  href="/clientes/carteira"
                  onClick={handleNavClick}
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
                  onClick={handleNavClick}
                >
                  <span>🌍</span>Países
                </a>
              </li>

              <li>
                <a
                  className={`sidebar-link ${activePage === "subdivisoes" ? "active" : ""}`}
                  href="/cadastros/estados"
                  onClick={handleNavClick}
                >
                  <span>🗺️</span>Estado/Província
                </a>
              </li>

              <li>
                <a
                  className={`sidebar-link ${activePage === "cidades" ? "active" : ""}`}
                  href="/cadastros/cidades"
                  onClick={handleNavClick}
                >
                  <span>🏙️</span>Cidades
                </a>
              </li>

              <li>
                <a
                  className={`sidebar-link ${activePage === "produtos" ? "active" : ""}`}
                  href="/cadastros/produtos"
                  onClick={handleNavClick}
                >
                  <span>🎫</span>Produtos
                </a>
              </li>

              <li>
                <a
                  className={`sidebar-link ${activePage === "fornecedores" ? "active" : ""}`}
                  href="/cadastros/fornecedores"
                  onClick={handleNavClick}
                >
                  <span>🎧</span>Fornecedores
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
                  onClick={handleNavClick}
                >
                  <span>📈</span>Vendas (detalhado)
                </a>
              </li>
              <li>
                <a
                  className={`sidebar-link ${activePage === "relatorios-vendas-destino" ? "active" : ""}`}
                  href="/relatorios/vendas-por-destino"
                  onClick={handleNavClick}
                >
                  <span>📌</span>Vendas por destino
                </a>
              </li>
              <li>
                <a
                  className={`sidebar-link ${activePage === "relatorios-vendas-produto" ? "active" : ""}`}
                  href="/relatorios/vendas-por-produto"
                  onClick={handleNavClick}
                >
                  <span>🎫</span>Vendas por produto
                </a>
              </li>
              <li>
                <a
                  className={`sidebar-link ${activePage === "relatorios-vendas-cliente" ? "active" : ""}`}
                  href="/relatorios/vendas-por-cliente"
                  onClick={handleNavClick}
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
              <li>
                <a
                  className={`sidebar-link ${activePage === "parametros-tipo-produtos" ? "active" : ""}`}
                  href="/parametros/tipo-produtos"
                  onClick={handleNavClick}
                >
                  <span>🏷️</span>Tipo de Produtos
                </a>
              </li>

              {can("Metas") && (
                <li>
                  <a
                    className={`sidebar-link ${activePage === "parametros-metas" ? "active" : ""}`}
                    href="/parametros/metas"
                    onClick={handleNavClick}
                  >
                    <span>🎯</span>Metas
                  </a>
                </li>
              )}

              <li>
                <a
                  className={`sidebar-link ${activePage === "parametros" ? "active" : ""}`}
                  href="/parametros"
                  onClick={handleNavClick}
                >
                  <span>⚙️</span>Parâmetros do Sistema
                </a>
              </li>

              <li>
                <a
                  className={`sidebar-link ${activePage === "regras-comissao" ? "active" : ""}`}
                  href="/parametros/regras-comissao"
                  onClick={handleNavClick}
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
                  onClick={handleNavClick}
                >
                  <span>👤</span>Perfil
                </a>
              </li>
            </ul>
          </div>
        )}

        {/* ADMIN */}
        {isAdminFinal && (
          <div>
            <div className="sidebar-section-title">Administração</div>
            <ul className="sidebar-nav">
              <li>
                <a
                  className={`sidebar-link ${activePage === "admin-permissoes" ? "active" : ""}`}
                  href="/admin/permissoes"
                  onClick={handleNavClick}
                >
                  <span>⚙️</span>Permissões
                </a>
              </li>
              <li>
                <a
                  className={`sidebar-link ${activePage === "admin-logs" ? "active" : ""}`}
                  href="/dashboard/logs"
                  onClick={handleNavClick}
                >
                  <span>📜</span>Logs
                </a>
              </li>
              <li>
                <a
                  className={`sidebar-link ${activePage === "admin-users" ? "active" : ""}`}
                  href="/dashboard/admin"
                  onClick={handleNavClick}
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
    </>
  );
}