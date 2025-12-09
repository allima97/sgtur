import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";

type Perfil = {
  nome_completo: string;
  cpf: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  email: string;
  uso_individual: boolean | null;
  company_id?: string | null;
  company?: { nome_empresa?: string | null; cnpj?: string | null; endereco?: string | null; telefone?: string | null } | null;
  cargo?: string | null;
};

export default function PerfilIsland() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [onboarding, setOnboarding] = useState(false);
  const [usoIndividual, setUsoIndividual] = useState<boolean | null>(null);
  const [novoCnpj, setNovoCnpj] = useState("");
  const [empresaAtual, setEmpresaAtual] = useState<{ nome?: string | null; cnpj?: string | null } | null>(null);

  const cidadeEstado = useMemo(() => {
    if (!perfil) return "";
    const c = perfil.cidade || "";
    const e = perfil.estado || "";
    return [c, e].filter(Boolean).join(" / ");
  }, [perfil]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOnboarding(params.get("onboarding") === "1");
  }, []);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          window.location.href = "/auth/login";
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("nome_completo, cpf, data_nascimento, telefone, cidade, estado, email, uso_individual, company_id, companies(nome_empresa, cnpj, endereco, telefone), user_types(name)")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        setPerfil({
          nome_completo: data?.nome_completo || "",
          cpf: data?.cpf || "",
          data_nascimento: data?.data_nascimento || "",
          telefone: data?.telefone || "",
          cidade: data?.cidade || "",
          estado: data?.estado || "",
          email: data?.email || user.email || "",
          uso_individual: data?.uso_individual ?? null,
          company_id: data?.company_id || null,
          company: data?.companies || null,
          cargo: data?.user_types?.name || null,
        });
        setNovoEmail(data?.email || user.email || "");
        setUsoIndividual(data?.uso_individual ?? null);
        setEmpresaAtual({
          nome: data?.companies?.nome_empresa || null,
          cnpj: data?.companies?.cnpj || null,
        });
      } catch (e) {
        console.error(e);
        setErro("Não foi possível carregar seu perfil.");
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

function atualizarCampo(campo: keyof Perfil, valor: string) {
  setPerfil((prev) => (prev ? { ...prev, [campo]: valor } : prev));
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

  async function salvarPerfil() {
    if (!perfil) return;
    setErro(null);
    setMsg(null);
    setSalvando(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        window.location.href = "/auth/login";
        return;
      }

      await supabase
        .from("users")
        .update({
          nome_completo: perfil.nome_completo || null,
          telefone: perfil.telefone || null,
          cidade: perfil.cidade || null,
          estado: perfil.estado || null,
          data_nascimento: perfil.data_nascimento || null,
          uso_individual: usoIndividual,
        })
        .eq("id", user.id);

      await registrarLog({
        user_id: user.id,
        acao: "perfil_atualizado",
        modulo: "perfil",
        detalhes: { cidade: perfil.cidade, estado: perfil.estado },
      });

      setMsg("Dados salvos com sucesso.");
    } catch (e: any) {
      console.error(e);
      setErro("Não foi possível salvar seus dados.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarSenha() {
    setErro(null);
    setMsg(null);
    if (!novaSenha || novaSenha.length < 6) {
      setErro("A nova senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setErro("As senhas não conferem.");
      return;
    }
    try {
      setSalvando(true);
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setMsg("Senha alterada com sucesso.");
      setNovaSenha("");
      setConfirmaSenha("");
    } catch (e: any) {
      console.error(e);
      setErro("Não foi possível alterar a senha.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarEmail() {
    setErro(null);
    setMsg(null);
    if (!novoEmail) {
      setErro("Informe um e-mail válido.");
      return;
    }
    try {
      setSalvando(true);
      const { error } = await supabase.auth.updateUser({ email: novoEmail });
      if (error) throw error;
      await supabase.from("users").update({ email: novoEmail }).eq("email", perfil?.email || novoEmail);
      setMsg("E-mail atualizado. Confirme o novo e-mail para continuar usando.");
      setPerfil((p) => (p ? { ...p, email: novoEmail } : p));
    } catch (e: any) {
      console.error(e);
      setErro("Não foi possível alterar o e-mail.");
    } finally {
      setSalvando(false);
    }
  }

  async function trocarEmpresa() {
    if (!novoCnpj.trim()) {
      setErro("Informe o CNPJ da nova empresa.");
      return;
    }

    try {
      setSalvando(true);
      const cnpjLimpo = novoCnpj.replace(/\D/g, "");
      const { data: empresas, error: empErr } = await supabase
        .from("companies")
        .select("id, nome_empresa, cnpj")
        .eq("cnpj", cnpjLimpo)
        .limit(1);
      if (empErr) throw empErr;
      if (!empresas || empresas.length === 0) {
        setErro("Empresa não encontrada para o CNPJ informado.");
        return;
      }
      const empresa = empresas[0];

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        window.location.href = "/auth/login";
        return;
      }

      await supabase.from("users").update({ company_id: empresa.id }).eq("id", user.id);
      setEmpresaAtual({ nome: empresa.nome_empresa, cnpj: empresa.cnpj });
      setMsg("Empresa atualizada com sucesso.");
      setErro(null);
    } catch (e: any) {
      console.error(e);
      setErro("Não foi possível trocar a empresa.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="card-base card-config">Carregando perfil...</div>;
  if (!perfil) return <div className="card-base card-config">Perfil não encontrado.</div>;

  return (
    <div className="perfil-page">
      {onboarding && (
        <div className="card-base card-config mb-3">
          Complete os dados para finalizar seu primeiro acesso.
        </div>
      )}

      {erro && (
        <div className="card-base card-config mb-3">
          {erro}
        </div>
      )}
      {msg && (
        <div className="card-base card-green mb-3">
          {msg}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <div className="card-base card-blue" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
          <h3>👤 Dados pessoais</h3>
          <div className="form-group">
            <label>Uso do sistema</label>
            <div className="flex items-center gap-4" style={{ marginTop: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="uso"
                  checked={usoIndividual !== false}
                  onChange={() => setUsoIndividual(true)}
                />
                Individual
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="uso"
                  checked={usoIndividual === false}
                  onChange={() => setUsoIndividual(false)}
                />
                Corporativo
              </label>
            </div>
            <small>Selecione conforme a forma de uso (pessoal ou vinculada à empresa).</small>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "3.8fr 0.8fr 1fr",
              gap: 12,
              marginTop: 16,
            }}
          >
            <div className="form-group">
              <label>Nome completo</label>
              <input
                className="form-input"
                value={perfil.nome_completo}
                onChange={(e) => atualizarCampo("nome_completo", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>CPF</label>
              <input
                className="form-input"
                value={formatCpf(perfil.cpf || "")}
                readOnly
                placeholder="000.000.000-00"
              />
            </div>
            <div className="form-group">
              <label>Data de nascimento</label>
              <input
                className="form-input"
                type="date"
                value={perfil.data_nascimento || ""}
                onChange={(e) => atualizarCampo("data_nascimento", e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr 1fr",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div className="form-group">
              <label>Telefone</label>
              <input
                className="form-input"
                value={formatTelefone(perfil.telefone || "")}
                onChange={(e) => atualizarCampo("telefone", formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <input
                className="form-input"
                value={perfil.cidade || ""}
                onChange={(e) => atualizarCampo("cidade", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>UF</label>
              <input
                className="form-input"
                value={perfil.estado || ""}
                maxLength={2}
                onChange={(e) => atualizarCampo("estado", e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "auto", alignItems: "center" }}>
            <button className="btn btn-primary" onClick={salvarPerfil} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar dados"}
            </button>
          </div>
        </div>

        <div className="card-base card-config" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
          <h3>🔐 Dados de acesso</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>E-mail de login</label>
              <input
                className="form-input"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                type="email"
              />
              <small>Será necessário confirmar o novo e-mail.</small>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btn-secondary" onClick={alterarEmail} disabled={salvando}>
                Atualizar e-mail
              </button>
            </div>
          </div>

          <h4 style={{ marginTop: 6, marginBottom: 4 }}>Alterar senha</h4>
          <div className="form-group" style={{ marginTop: 0 }}>
            <label>Nova senha</label>
            <input
              className="form-input"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="form-group" style={{ marginTop: 6 }}>
            <label>Confirmar senha</label>
            <input
              className="form-input"
              type="password"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "auto", alignItems: "center" }}>
            <button className="btn btn-primary" onClick={alterarSenha} disabled={salvando}>
              Alterar senha
            </button>
          </div>
        </div>

        <div className="card-base" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
          <h3>🏢 Empresa</h3>
          {empresaAtual ? (
            <p style={{ marginBottom: 12, lineHeight: 1.5 }}>
              <strong>Empresa:</strong> {empresaAtual.nome || "-"}<br />
              <strong>CNPJ:</strong> {empresaAtual.cnpj || "-"}<br />
              <strong>Endereço:</strong> {perfil.company?.endereco || "-"}<br />
              <strong>Telefone:</strong> {perfil.company?.telefone || "-"}<br />
              <strong>Cargo:</strong> {perfil.cargo || "-"}
            </p>
          ) : (
            <p style={{ marginBottom: 12 }}>Nenhuma empresa vinculada.</p>
          )}
          <div className="form-group">
            <label>Trocar empresa (CNPJ)</label>
            <input
              className="form-input"
              value={novoCnpj}
              onChange={(e) => setNovoCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: "auto", alignItems: "center" }}>
            <button className="btn btn-primary" onClick={trocarEmpresa} disabled={salvando}>
              Trocar empresa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
