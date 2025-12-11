import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";

export default function AuthLoginIsland() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: "success" | "danger" | "warning" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalSuspenso, setModalSuspenso] = useState(false);

  async function getIP() {
    try {
      const resp = await fetch("https://api.ipify.org?format=json");
      const j = await resp.json();
      return j.ip || "";
    } catch {
      return "";
    }
  }

  function mostrarMensagem(msg: string, tipo: "success" | "danger" | "warning" = "danger") {
    setMensagem({ texto: msg, tipo });
    setTimeout(() => setMensagem(null), 5000);
  }

  function abrirModalSuspenso() {
    setModalSuspenso(true);
  }
  function fecharModalSuspenso() {
    setModalSuspenso(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMensagem(null);
    setLoading(true);

    const emailLimpo = email.trim().toLowerCase();
    const senha = password;

    if (!emailLimpo || !senha) {
      mostrarMensagem("Informe e-mail e senha");
      setLoading(false);
      return;
    }

    const ip = await getIP();
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

    try {
      await registrarLog({ user_id: null, acao: "tentativa_login", modulo: "login", detalhes: { email: emailLimpo } });
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha });
      if (error) {
        await registrarLog({ user_id: null, acao: "login_falhou", modulo: "login", detalhes: { email, motivo: error.message, ip, userAgent } });
        mostrarMensagem("E-mail ou senha incorretos. Verifique seus dados e tente novamente.");
        setLoading(false);
        return;
      }
      const userId = data.user?.id || null;
      await registrarLog({ user_id: userId, acao: "login_sucesso", modulo: "login", detalhes: { email: emailLimpo, userId, ip, userAgent } });
      const { data: userInfo } = await supabase.auth.getUser();
      const emailConfirmado = Boolean(userInfo?.user?.email_confirmed_at || userInfo?.user?.confirmed_at);
      if (!emailConfirmado) {
        await supabase.auth.signOut();
        mostrarMensagem("Confirme seu e-mail antes de acessar o sistema.", "warning");
        setLoading(false);
        return;
      }
      // Buscar dados do usuário
      const { data: perfil, error: userError } = await supabase
        .from("users")
        .select("nome_completo, active, company_id, cpf, telefone, cidade, estado, uso_individual")
        .eq("id", userId)
        .maybeSingle();
      // Fallback para bancos sem coluna active
      let perfilFinal = perfil;
      const missingActiveColumn = userError && (userError.code === "42703" || userError.message?.toLowerCase().includes("active"));
      if (missingActiveColumn) {
        const { data: fallbackData } = await supabase
          .from("users")
          .select("nome_completo, company_id, cpf, telefone, cidade, estado, uso_individual")
          .eq("id", userId)
          .maybeSingle();
        perfilFinal = fallbackData;
      }
      if (!perfilFinal) {
        mostrarMensagem("Não foi possível carregar seu perfil. Tente novamente.");
        setLoading(false);
        return;
      }
      // Usuário suspenso
      if (perfilFinal && (perfilFinal as any).active === false) {
        abrirModalSuspenso();
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      // Onboarding
      const precisaOnboarding =
        !perfilFinal.nome_completo ||
        !perfilFinal.telefone ||
        !perfilFinal.cidade ||
        !perfilFinal.estado ||
        perfilFinal.uso_individual === null ||
        perfilFinal.uso_individual === undefined;
      if (precisaOnboarding) {
        window.location.replace("/perfil?onboarding=1");
        return;
      }
      window.location.replace("/dashboard");
    } catch (e: any) {
      await registrarLog({ user_id: null, acao: "login_erro_interno", modulo: "login", detalhes: { email, erro: e.message, ip, userAgent } });
      mostrarMensagem("Erro inesperado ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-lg">
        <div className="auth-header">
          <div className="auth-icon">
            <i className="fa-solid fa-plane-departure" aria-hidden />
          </div>
          <h1>Bem-vindo ao SGTUR</h1>
          <h2>Sistema de Gerenciamento de Turismo</h2>
          <p className="auth-subtitle">Use seu e-mail e senha para acessar ou faça seu cadastro</p>
        </div>

        {mensagem && (
          <div className={`alert alert-${mensagem.tipo}`} style={{ marginBottom: 12 }}>
            {mensagem.texto}
          </div>
        )}
        {erro && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{erro}</div>}

        {/* Modal de Acesso Suspenso */}
        {modalSuspenso && (
          <div className="modal">
            <div className="modal-overlay" onClick={fecharModalSuspenso}></div>
            <div className="modal-content">
              <div className="modal-header">
                <i className="fa-solid fa-triangle-exclamation text-yellow-600"></i>
                <h2>Acesso Suspenso</h2>
              </div>
              <div className="modal-body">
                <p className="text-lg font-semibold mb-4">Atenção!</p>
                <p className="text-gray-700 mb-6">
                  Seu acesso está suspenso, por favor entrar em contato com o Gestor ou Administrador do sistema.
                </p>
                <div className="contact-info">
                  <p className="text-sm text-gray-600">Se você acredita que isto é um erro, entre em contato:</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li><strong>Email:</strong> suporte@sgtur.com</li>
                    <li><strong>Telefone:</strong> (11) 1234-5678</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={fecharModalSuspenso} className="btn btn-secondary">Fechar</button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email"><i className="fa-solid fa-envelope"></i> E-mail</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="senha"><i className="fa-solid fa-lock"></i> Senha</label>
            <input
              type="password"
              id="senha"
              className="form-input"
              placeholder="Digite sua senha"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="auth-links auth-links-forgot">
            <a href="/auth/recover">
              <i className="fa-solid fa-unlock-keyhole"></i>
              Esqueceu a senha? Redefinir
            </a>
          </div>
          <div className="auth-actions">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              {loading ? " Entrando..." : " Entrar"}
            </button>
            <a
              href="/auth/register"
              className="btn btn-secondary btn-block"
            >
              <i className="fa-solid fa-user-plus"></i>
              Criar Nova Conta
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
