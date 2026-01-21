import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { logoutUsuario } from "../../lib/logout";
import { SYSTEM_NAME } from "../../lib/systemName";


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
  Circuitos: "cadastros_produtos",
  ProdutosLote: "cadastros_produtos",
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

const MODULO_ALIASES: Record<string, string> = Object.keys(MAPA_MODULOS).reduce(
  (acc, key) => {
    acc[key.toLowerCase()] = MAPA_MODULOS[key];
    return acc;
  },
  {} as Record<string, string>,
);

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

const FornecedoresIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="14" cy="8" r="4.2" />
    <path d="M9 18c0-1.5 1.7-3 5-3s5 1.5 5 3" />
    <path d="M8 25c1.5-3 6-4 8-4s6 1 7 4" />
    <rect x="11.5" y="19" width="6" height="4" rx="1" />
    <path d="M21.5 8v16" />
    <path d="M21.5 8l6 3-6 3" />
  </svg>
);

export default function MenuIsland({ activePage }) {
  const envMinutes = Number(import.meta.env.PUBLIC_AUTO_LOGOUT_MINUTES || "");
  const DEFAULT_LOGOUT_MINUTES =
    Number.isFinite(envMinutes) && envMinutes > 0 ? envMinutes : 15;
  const [userId, setUserId] = useState<string | null>(null);
  const [acessos, setAcessos] = useState<Record<string, NivelPermissao>>({});
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AUTO_LOGOUT_MS = DEFAULT_LOGOUT_MINUTES * 60 * 1000;
  const WARNING_LEAD_TIME_MS = 60 * 1000;
  const SESSION_EXTENSION_MS = 15 * 60 * 1000;
  const [remainingMs, setRemainingMs] = useState(AUTO_LOGOUT_MS);
  const deadlineRef = useRef(Date.now() + AUTO_LOGOUT_MS);

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
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const executarLogout = useCallback(
    async (mostrarFeedback = true) => {
      if (mostrarFeedback) setSaindo(true);
      setShowWarning(false);
      closeMobile();
      try {
        await logoutUsuario();
      } finally {
        if (mostrarFeedback) setSaindo(false);
      }
    },
    [closeMobile, setSaindo]
  );

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) closeMobile();
  };

  type MobileNavItem = {
    key: string;
    label: string;
    href: string;
    icon: React.ReactNode;
    active: string;
  };

  const clearTimers = useCallback(() => {
    if (logoutTimeoutRef.current) {
      window.clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  }, []);

  const scheduleTimers = useCallback(
    (durationMs = AUTO_LOGOUT_MS) => {
      setShowWarning(false);
      clearTimers();
    deadlineRef.current = Date.now() + durationMs;
    setRemainingMs(durationMs);
    logoutTimeoutRef.current = window.setTimeout(() => executarLogout(false), durationMs);
      const warningDelay = Math.max(durationMs - WARNING_LEAD_TIME_MS, 0);
      warningTimeoutRef.current = window.setTimeout(() => setShowWarning(true), warningDelay);
    },
    [AUTO_LOGOUT_MS, WARNING_LEAD_TIME_MS, clearTimers, executarLogout]
  );

  const handleExtendSession = () => {
    scheduleTimers(SESSION_EXTENSION_MS);
  };

  const handleActivity = useCallback(() => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    scheduleTimers();
  }, [scheduleTimers]);

  useEffect(() => {
    if (!mounted) return;

    scheduleTimers();
    const eventosAtividade = ["mousedown", "keydown", "scroll", "touchstart"];
    eventosAtividade.forEach((eventName) => window.addEventListener(eventName, handleActivity));

    return () => {
      eventosAtividade.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      clearTimers();
      setShowWarning(false);
    };
  }, [handleActivity, scheduleTimers, mounted, clearTimers]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const diff = Math.max(0, (deadlineRef.current || Date.now()) - Date.now());
      setRemainingMs(diff);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const displayMinutes = Math.floor(totalSeconds / 60);
  const displaySeconds = totalSeconds % 60;
  const countdownLabel =
    displayMinutes > 0
      ? `${displayMinutes}m ${displaySeconds.toString().padStart(2, "0")}s`
      : `${displaySeconds}s`;

  // monta mapa {modulo: permissao} pegando SEMPRE a maior permissão se houver duplicata
  function setPerm(perms: Record<string, NivelPermissao>, key: string, perm: NivelPermissao) {
    const normalizedKey = key.toLowerCase();
    const atual = perms[normalizedKey] ?? "none";
    perms[normalizedKey] = permLevel(perm) > permLevel(atual) ? perm : atual;
  }

  function mergePerm(perms: Record<string, NivelPermissao>, modulo: string, perm: NivelPermissao) {
    const normalizedModulo = modulo.toLowerCase();
    setPerm(perms, normalizedModulo, perm);

    const alias = MODULO_ALIASES[normalizedModulo];
    if (alias) {
      setPerm(perms, alias, perm);
    }
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
    await executarLogout(true);
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

  const cadastrosMenu = [
    { name: "Paises", href: "/cadastros/paises", active: "paises", icon: "🌍", label: "Países" },
    {
      name: "Subdivisoes",
      href: "/cadastros/estados",
      active: "subdivisoes",
      icon: "🗺️",
      label: "Estado/Província",
    },
    { name: "Cidades", href: "/cadastros/cidades", active: "cidades", icon: "🏙️", label: "Cidades" },
    { name: "Produtos", href: "/cadastros/produtos", active: "produtos", icon: "🎫", label: "Produtos" },
    { name: "Circuitos", href: "/cadastros/circuitos", active: "circuitos", icon: "🧭", label: "Circuitos" },
    { name: "ProdutosLote", href: "/cadastros/lote", active: "lote", icon: "📦", label: "Lote" },
    {
      name: "Fornecedores",
      href: "/cadastros/fornecedores",
      active: "fornecedores",
      icon: <FornecedoresIcon />,
      label: "Fornecedores",
    },
  ];
  const hasCadastrosSection = cadastrosMenu.some((item) => can(item.name));

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

  const mobileNavItems: MobileNavItem[] = [];
  if (can("Dashboard")) {
    mobileNavItems.push({
      key: "dashboard",
      label: "Dashboard",
      href: "/",
      icon: "📊",
      active: "dashboard",
    });
  }
  if (can("Vendas")) {
    mobileNavItems.push({
      key: "vendas",
      label: "Vendas",
      href: "/vendas/consulta",
      icon: "🧾",
      active: "vendas",
    });
  }
  if (can("Orcamentos")) {
    mobileNavItems.push({
      key: "orcamentos",
      label: "Orçamentos",
      href: "/orcamentos/consulta",
      icon: "💼",
      active: "orcamentos",
    });
  }
  if (can("Clientes")) {
    mobileNavItems.push({
      key: "clientes",
      label: "Clientes",
      href: "/clientes/carteira",
      icon: "👥",
      active: "clientes",
    });
  }

  const mobileBottomNav = mounted
    ? createPortal(
        <nav className="mobile-bottom-nav" aria-label="Atalhos principais">
          {mobileNavItems.map((item) => (
            <a
              key={item.key}
              className={`mobile-bottom-nav-item ${activePage === item.active ? "active" : ""}`}
              href={item.href}
              onClick={handleNavClick}
            >
              <span className="mobile-bottom-nav-icon">{item.icon}</span>
              <span className="mobile-bottom-nav-label">{item.label}</span>
            </a>
          ))}
          <button
            type="button"
            className="mobile-bottom-nav-item"
            aria-expanded={mobileOpen}
            aria-controls={sidebarId}
            onClick={toggleMobile}
          >
            <span className="mobile-bottom-nav-icon">☰</span>
            <span className="mobile-bottom-nav-label">Mais</span>
          </button>
        </nav>,
        document.body
      )
    : null;

  return (
    <>
      {mobileControls}
      {mobileBottomNav}
      <aside id={sidebarId} className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
            <div className="sidebar-logo">{SYSTEM_NAME}</div>

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
              <>
                <li>
                  <a
                    className={`sidebar-link ${activePage === "orcamentos" ? "active" : ""}`}
                    href="/orcamentos/consulta"
                    onClick={handleNavClick}
                  >
                    <span>💼</span>Orçamentos
                  </a>
                </li>
              </>
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
        {hasCadastrosSection && (
          <div>
            <div className="sidebar-section-title">Cadastros</div>
            <ul className="sidebar-nav">
              {cadastrosMenu
                .filter((item) => can(item.name))
                .map((item) => (
                  <li key={item.name}>
                    <a
                      className={`sidebar-link ${activePage === item.active ? "active" : ""}`}
                      href={item.href}
                      onClick={handleNavClick}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </a>
                  </li>
                ))}
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
                  className={`sidebar-link ${activePage === "parametros-cambios" ? "active" : ""}`}
                  href="/parametros/cambios"
                  onClick={handleNavClick}
                >
                  <span>💱</span>Câmbios
                </a>
              </li>

              <li>
                <a
                  className={`sidebar-link ${activePage === "parametros-orcamentos" ? "active" : ""}`}
                  href="/parametros/orcamentos"
                  onClick={handleNavClick}
                >
                  <span>🧾</span>Orçamentos (PDF)
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
                  <span>🧑</span>Usuários
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
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          top: 12,
          right: 16,
          zIndex: 950,
          backgroundColor: "rgba(248, 250, 252, 0.85)",
          borderRadius: 999,
          padding: "4px 12px",
          border: "1px solid rgba(148, 163, 184, 0.6)",
          fontSize: "0.75rem",
          color: "#0f172a",
          backdropFilter: "blur(6px)",
          boxShadow: "0 10px 30px rgba(15,23,42,0.25)",
        }}
      >
        Sessão ativa • {countdownLabel}
      </div>
      {showWarning && (
        <div
          role="alertdialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: "24px 32px",
              boxShadow: "0 30px 60px rgba(15,23,42,0.35)",
              maxWidth: 420,
              width: "100%",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Sessão quase expirando</h3>
            <p style={{ marginTop: 0, marginBottom: 20 }}>
              Sua sessão será encerrada automaticamente em 1 minuto por inatividade. Clique em
              “Continuar Logado” para ganhar mais 15 minutos sem perder o progresso.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={handleExtendSession}>
                Continuar Logado
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => executarLogout(true)}
              >
                Sair agora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
