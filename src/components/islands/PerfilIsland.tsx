import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";

type Perfil = {
  nome_completo: string;
  cpf: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  whatsapp: string | null;
  rg: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  estado: string | null;
  email: string;
  uso_individual: boolean | null;
  company_id?: string | null;
  company?: {
    nome_empresa?: string | null;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
  cargo?: string | null;
  created_by_gestor?: boolean | null;
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
  const [empresaForm, setEmpresaForm] = useState({
    cnpj: "",
    nome_empresa: "",
    nome_fantasia: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
  });
  const [empresaAtual, setEmpresaAtual] = useState<{
    id?: string | null;
    nome_empresa?: string | null;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null>(null);
  const [empresaStatus, setEmpresaStatus] = useState<string | null>(null);
  const [empresaLoading, setEmpresaLoading] = useState(false);
  const [camposExtrasOk, setCamposExtrasOk] = useState(true);
  const [cepStatus, setCepStatus] = useState<string | null>(null);
  const [modalOnboardingSucesso, setModalOnboardingSucesso] = useState(false);
  const bloqueiaEmpresaTipo = Boolean(perfil?.created_by_gestor);
  const empresaDisabled = bloqueiaEmpresaTipo || usoIndividual !== false;

  const cidadeEstado = useMemo(() => {
    if (!perfil) return "";
    const c = perfil.cidade || "";
    const e = perfil.estado || "";
    return [c, e].filter(Boolean).join(" / ");
  }, [perfil]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const onboardingQuery = params.get("onboarding") === "1";
    const onboardingPath =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/perfil/onboarding");
    setOnboarding(onboardingQuery || onboardingPath);
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

        const colsExtras =
          "nome_completo, cpf, data_nascimento, telefone, whatsapp, rg, cep, endereco, numero, complemento, cidade, estado, email, uso_individual, company_id, created_by_gestor, companies(nome_empresa, nome_fantasia, cnpj, endereco, telefone, cidade, estado), user_types(name)";
        const colsBasicos =
          "nome_completo, cpf, data_nascimento, telefone, cidade, estado, email, uso_individual, company_id, companies(nome_empresa, nome_fantasia, cnpj, endereco, telefone, cidade, estado), user_types(name)";

        let extrasDisponiveis = true;
        let { data, error } = await supabase.from("users").select(colsExtras).eq("id", user.id).maybeSingle();

        if (error && (error as any).code === "PGRST204") {
          // Colunas novas ausentes: refaz consulta sem campos extras
          extrasDisponiveis = false;
          const fallback = await supabase.from("users").select(colsBasicos).eq("id", user.id).maybeSingle();
          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;

        setCamposExtrasOk(extrasDisponiveis);
        setPerfil({
          nome_completo: data?.nome_completo || "",
          cpf: data?.cpf || "",
          data_nascimento: data?.data_nascimento || "",
          telefone: data?.telefone || "",
          whatsapp: extrasDisponiveis ? data?.whatsapp || "" : "",
          rg: extrasDisponiveis ? data?.rg || "" : "",
          cep: extrasDisponiveis ? data?.cep || "" : "",
          endereco: extrasDisponiveis ? data?.endereco || "" : "",
          numero: extrasDisponiveis ? data?.numero || "" : "",
          complemento: extrasDisponiveis ? data?.complemento || "" : "",
          cidade: data?.cidade || "",
          estado: data?.estado || "",
          email: data?.email || user.email || "",
          uso_individual: data?.uso_individual ?? null,
          company_id: data?.company_id || null,
          company: data?.companies || null,
          cargo: data?.user_types?.name || null,
          created_by_gestor: (data as any)?.created_by_gestor ?? null,
        });
        setNovoEmail(data?.email || user.email || "");
        setUsoIndividual(data?.uso_individual ?? null);
        setEmpresaForm({
          cnpj: data?.companies?.cnpj || "",
          nome_empresa: data?.companies?.nome_empresa || "",
          nome_fantasia: data?.companies?.nome_fantasia || "",
          telefone: data?.companies?.telefone || "",
          endereco: data?.companies?.endereco || "",
          cidade: data?.companies?.cidade || "",
          estado: data?.companies?.estado || "",
        });
        setEmpresaAtual(
          data?.companies
            ? {
                id: data?.company_id || null,
                nome_empresa: data?.companies?.nome_empresa || null,
                nome_fantasia: data?.companies?.nome_fantasia || null,
                cnpj: data?.companies?.cnpj || null,
                endereco: data?.companies?.endereco || null,
                telefone: data?.companies?.telefone || null,
                cidade: data?.companies?.cidade || null,
                estado: data?.companies?.estado || null,
              }
            : null
        );
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

  function atualizarEmpresa(
    campo: "cnpj" | "nome_empresa" | "nome_fantasia" | "telefone" | "endereco" | "cidade" | "estado",
    valor: string
  ) {
    if (campo === "cnpj") {
      setEmpresaStatus(null);
    }
    setEmpresaForm((prev) => ({ ...prev, [campo]: valor }));
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

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

  async function resolverEmpresa(permitirCriar: boolean) {
    const cnpjLimpo = (empresaForm.cnpj || "").replace(/\D/g, "");
    if (!cnpjLimpo) {
      setErro("Informe o CNPJ da empresa.");
      return null;
    }
    if (permitirCriar && !empresaForm.nome_empresa.trim()) {
      setErro("Informe o nome da empresa.");
      return null;
    }

    setEmpresaLoading(true);
    setEmpresaStatus(permitirCriar ? "Salvando empresa..." : "Buscando empresa...");
    setErro(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const payload = {
        cnpj: cnpjLimpo,
        allowCreate: permitirCriar,
        nome_empresa: empresaForm.nome_empresa.trim() || null,
        nome_fantasia: empresaForm.nome_fantasia.trim() || null,
        telefone: empresaForm.telefone.trim() || null,
        endereco: empresaForm.endereco.trim() || null,
        cidade: empresaForm.cidade.trim() || null,
        estado: empresaForm.estado.trim().toUpperCase() || null,
      };

      const resp = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.status === 404) {
        setEmpresaStatus("Empresa não encontrada. Preencha os dados para cadastrar.");
        return null;
      }
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Falha ao resolver empresa.");
      }

      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await resp.text();
        throw new Error(text || "Resposta inesperada ao buscar empresa.");
      }

      const empresa = await resp.json();
      setEmpresaAtual({
        id: empresa?.id ?? null,
        nome_empresa: empresa?.nome_empresa ?? null,
        nome_fantasia: empresa?.nome_fantasia ?? null,
        cnpj: empresa?.cnpj ?? null,
        endereco: empresa?.endereco ?? null,
        telefone: empresa?.telefone ?? null,
        cidade: empresa?.cidade ?? null,
        estado: empresa?.estado ?? null,
      });
      setEmpresaForm((prev) => ({
        ...prev,
        cnpj: formatCnpj(empresa?.cnpj || cnpjLimpo),
        nome_empresa: empresa?.nome_empresa || prev.nome_empresa,
        nome_fantasia: empresa?.nome_fantasia || prev.nome_fantasia,
        telefone: empresa?.telefone || prev.telefone,
        endereco: empresa?.endereco || prev.endereco,
        cidade: empresa?.cidade || prev.cidade,
        estado: empresa?.estado || prev.estado,
      }));
      setEmpresaStatus("Empresa vinculada.");
      return empresa;
    } catch (e) {
      console.error(e);
      setEmpresaStatus("Não foi possível buscar a empresa. Tente novamente.");
      setErro("Não foi possível vincular a empresa.");
      return null;
    } finally {
      setEmpresaLoading(false);
    }
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

      let companyId = perfil.company_id ?? null;
      if (usoIndividual === false) {
        const empresa = await resolverEmpresa(true);
        if (!empresa?.id) {
          setSalvando(false);
          return;
        }
        companyId = empresa.id;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          nome_completo: perfil.nome_completo || null,
          cpf: perfil.cpf || null,
          telefone: perfil.telefone || null,
          cidade: perfil.cidade || null,
          estado: perfil.estado || null,
          data_nascimento: perfil.data_nascimento || null,
          uso_individual: usoIndividual,
          company_id: companyId,
          ...(camposExtrasOk
            ? {
                whatsapp: perfil.whatsapp || null,
                rg: perfil.rg || null,
                cep: perfil.cep || null,
                endereco: perfil.endereco || null,
                numero: perfil.numero || null,
                complemento: perfil.complemento || null,
              }
            : {}),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await registrarLog({
        user_id: user.id,
        acao: "perfil_atualizado",
        modulo: "perfil",
        detalhes: { cidade: perfil.cidade, estado: perfil.estado },
      });

      if (onboarding) {
        setModalOnboardingSucesso(true);
      } else {
        setMsg("Dados salvos com sucesso.");
      }
    } catch (e: any) {
      console.error(e);
      setErro("Não foi possível salvar seus dados.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarLoginNoSistema() {
    try {
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/auth/login";
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
    if (bloqueiaEmpresaTipo) {
      setErro("A empresa é definida pelo gestor.");
      return;
    }
    if (!empresaForm.cnpj.trim()) {
      setErro("Informe o CNPJ da empresa.");
      return;
    }

    try {
      setSalvando(true);
      const empresa = await resolverEmpresa(true);
      if (!empresa?.id) {
        setSalvando(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        window.location.href = "/auth/login";
        return;
      }

      await supabase.from("users").update({ company_id: empresa.id }).eq("id", user.id);
      setEmpresaAtual({
        id: empresa.id,
        nome_empresa: empresa?.nome_empresa || null,
        nome_fantasia: empresa?.nome_fantasia || null,
        cnpj: empresa?.cnpj || null,
        endereco: empresa?.endereco || null,
        telefone: empresa?.telefone || null,
        cidade: empresa?.cidade || null,
        estado: empresa?.estado || null,
      });
      setPerfil((prev) => (prev ? { ...prev, company_id: empresa.id } : prev));
      setMsg("Empresa atualizada com sucesso.");
      setErro(null);
    } catch (e: any) {
      console.error(e);
      setErro("Não foi possível trocar a empresa.");
    } finally {
      setSalvando(false);
    }
  }

  // Função precisa estar dentro do componente para acessar o estado corretamente
  async function buscarCepIfNeeded(cepRaw: string) {
    if (!camposExtrasOk) return;
    const digits = (cepRaw || "").replace(/\D/g, "");
    console.log("[CEP] Valor recebido:", cepRaw, "| Somente dígitos:", digits);
    if (digits.length !== 8) {
      setCepStatus(null);
      console.log("[CEP] Menos de 8 dígitos, abortando busca");
      return;
    }
    try {
      setCepStatus("Buscando endereço...");
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { mode: "cors" });
      if (!resp.ok) throw new Error("CEP inválido ou indisponível.");
      const data = await resp.json();
      console.log("[CEP] Resposta ViaCEP:", data);
      if (data.erro) throw new Error("CEP não encontrado.");
      setPerfil((prev) =>
        prev
          ? {
              ...prev,
              cep: formatCep(digits),
              endereco: data.logradouro || "",
              cidade: data.localidade || "",
              estado: data.uf || "",
            }
          : prev
      );
      setCepStatus("Endereço carregado pelo CEP.");
      console.log("[CEP] Perfil atualizado com endereço, cidade e estado do ViaCEP");
    } catch (e: any) {
      console.error("Erro ao buscar CEP:", e);
      setCepStatus("Não foi possível carregar o CEP.");
    }
  }

  if (loading) return <div className="card-base card-config">Carregando perfil...</div>;
  if (!perfil) return <div className="card-base card-config">Perfil não encontrado.</div>;

  return (
    <div className="perfil-page">
      {modalOnboardingSucesso && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-panel" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-circle-check text-green-600"></i>
                Dados salvos
              </div>
            </div>
            <div className="modal-body">
              <p>Dados salvos com sucesso! Deseja fazer o login no sistema?</p>
            </div>
            <div className="modal-footer">
              <button onClick={confirmarLoginNoSistema} className="btn btn-primary">
                Sim
              </button>
              <button onClick={() => setModalOnboardingSucesso(false)} className="btn btn-secondary">
                Não
              </button>
            </div>
          </div>
        </div>
      )}
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

      <div className="flex flex-col gap-3">
        <div className="card-base card-blue" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
          <h3>👤 Dados pessoais</h3>
          {!camposExtrasOk && (
            <small style={{ color: "#b91c1c", marginBottom: 8 }}>
              Campos extras indisponíveis. Adicione as colunas novas em "users" no banco para editar CEP/WhatsApp/RG/endereço.
            </small>
          )}
            <div className="form-group">
              <label>Uso do sistema</label>
              <div className="flex items-center gap-4" style={{ marginTop: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name="uso"
                    checked={usoIndividual !== false}
                    onChange={() => setUsoIndividual(true)}
                    disabled={bloqueiaEmpresaTipo}
                  />
                  Individual
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    name="uso"
                    checked={usoIndividual === false}
                    onChange={() => setUsoIndividual(false)}
                    disabled={bloqueiaEmpresaTipo}
                  />
                  Corporativo
                </label>
              </div>
            <small>
              {bloqueiaEmpresaTipo
                ? "Definido pelo gestor."
                : "Selecione conforme a forma de uso (pessoal ou vinculada à empresa)."}
            </small>
            </div>
          <div
            className="perfil-grid"
            style={{
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.1fr)",
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
                onChange={(e) => atualizarCampo("cpf", formatCpf(e.target.value))}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="form-group">
              <label>RG</label>
              <input
                className="form-input"
                value={perfil.rg || ""}
                onChange={(e) => atualizarCampo("rg", e.target.value)}
                placeholder="Documento"
                disabled={!camposExtrasOk}
              />
            </div>
            <div className="form-group">
              <label>Data Nascimento</label>
              <input
                className="form-input"
                type="date"
                value={perfil.data_nascimento || ""}
                onChange={(e) => atualizarCampo("data_nascimento", e.target.value)}
              />
            </div>
          </div>

          <div
            className="perfil-grid"
            style={{
              gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 2fr) minmax(0, 0.7fr) minmax(0, 1fr)",
              marginTop: 12,
            }}
          >
            <div className="form-group">
              <label>CEP</label>
              <input
                className="form-input"
                value={formatCep(perfil.cep || "")}
                onChange={(e) => {
                  const val = formatCep(e.target.value);
                  atualizarCampo("cep", val);
                }}
                onBlur={(e) => {
                  const val = formatCep(e.target.value);
                  if (val.replace(/\D/g, "").length === 8) {
                    buscarCepIfNeeded(val);
                  }
                }}
                placeholder="00000-000"
                disabled={!camposExtrasOk}
              />
              <small style={{ color: cepStatus?.includes("Não foi") ? "#b91c1c" : "#475569" }}>
                {cepStatus || "Preencha para auto-preencher endereço."}
              </small>
            </div>
            <div className="form-group">
              <label>Endereço</label>
              <input
                className="form-input"
                value={perfil.endereco || ""}
                onChange={(e) => atualizarCampo("endereco", e.target.value)}
                placeholder="Rua / Avenida"
                disabled={!camposExtrasOk}
              />
            </div>
            <div className="form-group">
              <label>Número</label>
              <input
                className="form-input"
                value={perfil.numero || ""}
                onChange={(e) => atualizarCampo("numero", e.target.value)}
                placeholder="Nº"
                disabled={!camposExtrasOk}
              />
            </div>
            <div className="form-group">
              <label>Complemento</label>
              <input
                className="form-input"
                value={perfil.complemento || ""}
                onChange={(e) => atualizarCampo("complemento", e.target.value)}
                placeholder="Opcional"
                disabled={!camposExtrasOk}
              />
            </div>
          </div>

          <div
            className="perfil-grid"
            style={{
              gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.6fr)",
              marginTop: 12,
            }}
          >
            <div className="form-group">
              <label>E-mail</label>
              <input
                className="form-input"
                type="email"
                value={perfil.email}
                onChange={(e) => {
                  atualizarCampo("email", e.target.value);
                  setNovoEmail(e.target.value);
                }}
                placeholder="seu@email.com"
              />
            </div>
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
              <label>WhatsApp</label>
              <input
                className="form-input"
                value={formatTelefone(perfil.whatsapp || "")}
                onChange={(e) => atualizarCampo("whatsapp", formatTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                disabled={!camposExtrasOk}
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
              <label>Estado</label>
              <input
                className="form-input"
                value={perfil.estado || ""}
                maxLength={2}
                onChange={(e) => atualizarCampo("estado", e.target.value.toUpperCase())}
                placeholder="UF"
              />
            </div>
          </div>
          <div className="mobile-stack-buttons" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={salvarPerfil} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar dados"}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="card-base card-config" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
            <h3>🔐 Dados de acesso</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
              <div className="mobile-stack-buttons">
                <button className="btn btn-secondary w-full sm:w-auto" onClick={alterarEmail} disabled={salvando}>
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
            <div className="mobile-stack-buttons" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={alterarSenha} disabled={salvando}>
                Alterar senha
              </button>
            </div>
          </div>

          <div className="card-base" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
            <h3>🏢 Empresa</h3>
            {empresaAtual ? (
              <p className="perfil-text-wrap" style={{ marginBottom: 12, lineHeight: 1.5 }}>
                <strong>Empresa:</strong> {empresaAtual.nome_empresa || "-"}<br />
                <strong>Fantasia:</strong> {empresaAtual.nome_fantasia || "-"}<br />
                <strong>CNPJ:</strong> {empresaAtual.cnpj || "-"}<br />
                <strong>Endereço:</strong> {empresaAtual.endereco || "-"}<br />
                <strong>Telefone:</strong> {empresaAtual.telefone || "-"}<br />
                <strong>Cidade/Estado:</strong>{" "}
                {[empresaAtual.cidade, empresaAtual.estado].filter(Boolean).join(" / ") || "-"}<br />
                <strong>Cargo:</strong> {perfil.cargo || "-"}
              </p>
            ) : (
              <p style={{ marginBottom: 12 }}>Nenhuma empresa vinculada.</p>
            )}
            <div className="form-group">
              <label>CNPJ</label>
              <input
                className="form-input"
                value={formatCnpj(empresaForm.cnpj)}
                onChange={(e) => atualizarEmpresa("cnpj", formatCnpj(e.target.value))}
                onBlur={() => {
                  if (!empresaDisabled && empresaForm.cnpj.trim()) {
                    resolverEmpresa(false);
                  }
                }}
                placeholder="00.000.000/0000-00"
                disabled={empresaDisabled}
              />
              <small style={{ opacity: 0.75 }}>
                {empresaStatus || "Informe o CNPJ para buscar uma empresa existente."}
              </small>
            </div>
            <div
              className="perfil-grid"
              style={{
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.2fr)",
                marginTop: 8,
              }}
            >
              <div className="form-group">
                <label>Nome da empresa</label>
                <input
                  className="form-input"
                  value={empresaForm.nome_empresa}
                  onChange={(e) => atualizarEmpresa("nome_empresa", e.target.value)}
                  placeholder="Razao social"
                  disabled={empresaDisabled}
                />
              </div>
              <div className="form-group">
                <label>Nome fantasia</label>
                <input
                  className="form-input"
                  value={empresaForm.nome_fantasia}
                  onChange={(e) => atualizarEmpresa("nome_fantasia", e.target.value)}
                  placeholder="Nome fantasia"
                  disabled={empresaDisabled}
                />
              </div>
            </div>
            <div
              className="perfil-grid"
              style={{
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.7fr)",
                marginTop: 8,
              }}
            >
              <div className="form-group">
                <label>Telefone</label>
                <input
                  className="form-input"
                  value={formatTelefone(empresaForm.telefone || "")}
                  onChange={(e) => atualizarEmpresa("telefone", formatTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  disabled={empresaDisabled}
                />
              </div>
              <div className="form-group">
                <label>Endereço</label>
                <input
                  className="form-input"
                  value={empresaForm.endereco}
                  onChange={(e) => atualizarEmpresa("endereco", e.target.value)}
                  placeholder="Rua / Avenida"
                  disabled={empresaDisabled}
                />
              </div>
              <div className="form-group">
                <label>Cidade</label>
                <input
                  className="form-input"
                  value={empresaForm.cidade}
                  onChange={(e) => atualizarEmpresa("cidade", e.target.value)}
                  disabled={empresaDisabled}
                />
              </div>
              <div className="form-group">
                <label>Estado</label>
                <input
                  className="form-input"
                  value={empresaForm.estado}
                  maxLength={2}
                  onChange={(e) => atualizarEmpresa("estado", e.target.value.toUpperCase())}
                  placeholder="UF"
                  disabled={empresaDisabled}
                />
              </div>
            </div>
            <div className="mobile-stack-buttons" style={{ marginTop: "auto" }}>
              <button
                className="btn btn-primary"
                onClick={trocarEmpresa}
                disabled={salvando || empresaLoading || empresaDisabled}
              >
                Vincular empresa
              </button>
              {empresaDisabled && (
                <small style={{ opacity: 0.7 }}>
                  {bloqueiaEmpresaTipo
                    ? "Empresa e cargo sao definidos pelo gestor."
                    : "Selecione uso corporativo para informar a empresa."}
                </small>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
