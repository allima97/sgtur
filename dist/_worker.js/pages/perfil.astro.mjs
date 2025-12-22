globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C6IdV9ex.mjs';
/* empty css                                      */
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_DgtdOcH4.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../chunks/systemName_BQeIdnjR.mjs';
import { r as reactExports } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { r as registrarLog } from '../chunks/logs_CDnMuknJ.mjs';

function PerfilIsland() {
  const [perfil, setPerfil] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [msg, setMsg] = reactExports.useState(null);
  const [erro, setErro] = reactExports.useState(null);
  const [novaSenha, setNovaSenha] = reactExports.useState("");
  const [confirmaSenha, setConfirmaSenha] = reactExports.useState("");
  const [novoEmail, setNovoEmail] = reactExports.useState("");
  const [onboarding, setOnboarding] = reactExports.useState(false);
  const [usoIndividual, setUsoIndividual] = reactExports.useState(null);
  const [novoCnpj, setNovoCnpj] = reactExports.useState("");
  const [empresaAtual, setEmpresaAtual] = reactExports.useState(null);
  const [camposExtrasOk, setCamposExtrasOk] = reactExports.useState(true);
  const [cepStatus, setCepStatus] = reactExports.useState(null);
  reactExports.useMemo(() => {
    if (!perfil) return "";
    const c = perfil.cidade || "";
    const e = perfil.estado || "";
    return [c, e].filter(Boolean).join(" / ");
  }, [perfil]);
  reactExports.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOnboarding(params.get("onboarding") === "1");
  }, []);
  reactExports.useEffect(() => {
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
        const colsExtras = "nome_completo, cpf, data_nascimento, telefone, whatsapp, rg, cep, endereco, numero, complemento, cidade, estado, email, uso_individual, company_id, companies(nome_empresa, cnpj, endereco, telefone), user_types(name)";
        const colsBasicos = "nome_completo, cpf, data_nascimento, telefone, cidade, estado, email, uso_individual, company_id, companies(nome_empresa, cnpj, endereco, telefone), user_types(name)";
        let extrasDisponiveis = true;
        let { data, error } = await supabase.from("users").select(colsExtras).eq("id", user.id).maybeSingle();
        if (error && error.code === "PGRST204") {
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
          cargo: data?.user_types?.name || null
        });
        setNovoEmail(data?.email || user.email || "");
        setUsoIndividual(data?.uso_individual ?? null);
        setEmpresaAtual({
          nome: data?.companies?.nome_empresa || null,
          cnpj: data?.companies?.cnpj || null
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
  function atualizarCampo(campo, valor) {
    setPerfil((prev) => prev ? { ...prev, [campo]: valor } : prev);
  }
  function formatCpf(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  function formatTelefone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
  function formatCep(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, "$1-$2");
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
      await supabase.from("users").update({
        nome_completo: perfil.nome_completo || null,
        telefone: perfil.telefone || null,
        cidade: perfil.cidade || null,
        estado: perfil.estado || null,
        data_nascimento: perfil.data_nascimento || null,
        uso_individual: usoIndividual,
        ...camposExtrasOk ? {
          whatsapp: perfil.whatsapp || null,
          rg: perfil.rg || null,
          cep: perfil.cep || null,
          endereco: perfil.endereco || null,
          numero: perfil.numero || null,
          complemento: perfil.complemento || null
        } : {}
      }).eq("id", user.id);
      await registrarLog({
        user_id: user.id,
        acao: "perfil_atualizado",
        modulo: "perfil",
        detalhes: { cidade: perfil.cidade, estado: perfil.estado }
      });
      setMsg("Dados salvos com sucesso.");
    } catch (e) {
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
    } catch (e) {
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
      setPerfil((p) => p ? { ...p, email: novoEmail } : p);
    } catch (e) {
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
      const { data: empresas, error: empErr } = await supabase.from("companies").select("id, nome_empresa, cnpj").eq("cnpj", cnpjLimpo).limit(1);
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
    } catch (e) {
      console.error(e);
      setErro("Não foi possível trocar a empresa.");
    } finally {
      setSalvando(false);
    }
  }
  async function buscarCepIfNeeded(cepRaw) {
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
      setPerfil(
        (prev) => prev ? {
          ...prev,
          cep: formatCep(digits),
          endereco: data.logradouro || "",
          cidade: data.localidade || "",
          estado: data.uf || ""
        } : prev
      );
      setCepStatus("Endereço carregado pelo CEP.");
      console.log("[CEP] Perfil atualizado com endereço, cidade e estado do ViaCEP");
    } catch (e) {
      console.error("Erro ao buscar CEP:", e);
      setCepStatus("Não foi possível carregar o CEP.");
    }
  }
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: "Carregando perfil..." });
  if (!perfil) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: "Perfil não encontrado." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "perfil-page", children: [
    onboarding && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Complete os dados para finalizar seu primeiro acesso." }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: erro }),
    msg && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-green mb-3", children: msg }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue", style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "👤 Dados pessoais" }),
        !camposExtrasOk && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#b91c1c", marginBottom: 8 }, children: 'Campos extras indisponíveis. Adicione as colunas novas em "users" no banco para editar CEP/WhatsApp/RG/endereço.' }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Uso do sistema" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", style: { marginTop: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "radio",
                  name: "uso",
                  checked: usoIndividual !== false,
                  onChange: () => setUsoIndividual(true)
                }
              ),
              "Individual"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "radio",
                  name: "uso",
                  checked: usoIndividual === false,
                  onChange: () => setUsoIndividual(false)
                }
              ),
              "Corporativo"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "Selecione conforme a forma de uso (pessoal ou vinculada à empresa)." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.1fr)",
              gap: 12,
              marginTop: 16
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Nome completo" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: perfil.nome_completo,
                    onChange: (e) => atualizarCampo("nome_completo", e.target.value),
                    required: true
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "CPF" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: formatCpf(perfil.cpf || ""),
                    readOnly: true,
                    placeholder: "000.000.000-00"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "RG" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: perfil.rg || "",
                    onChange: (e) => atualizarCampo("rg", e.target.value),
                    placeholder: "Documento",
                    disabled: !camposExtrasOk
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Data Nascimento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    type: "date",
                    value: perfil.data_nascimento || "",
                    onChange: (e) => atualizarCampo("data_nascimento", e.target.value)
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 2fr) minmax(0, 0.7fr) minmax(0, 1fr)",
              gap: 12,
              marginTop: 12
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "CEP" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: formatCep(perfil.cep || ""),
                    onChange: (e) => {
                      const val = formatCep(e.target.value);
                      atualizarCampo("cep", val);
                    },
                    onBlur: (e) => {
                      const val = formatCep(e.target.value);
                      if (val.replace(/\D/g, "").length === 8) {
                        buscarCepIfNeeded(val);
                      }
                    },
                    placeholder: "00000-000",
                    disabled: !camposExtrasOk
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: cepStatus?.includes("Não foi") ? "#b91c1c" : "#475569" }, children: cepStatus || "Preencha para auto-preencher endereço." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Endereço" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: perfil.endereco || "",
                    onChange: (e) => atualizarCampo("endereco", e.target.value),
                    placeholder: "Rua / Avenida",
                    disabled: !camposExtrasOk
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Número" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: perfil.numero || "",
                    onChange: (e) => atualizarCampo("numero", e.target.value),
                    placeholder: "Nº",
                    disabled: !camposExtrasOk
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Complemento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: perfil.complemento || "",
                    onChange: (e) => atualizarCampo("complemento", e.target.value),
                    placeholder: "Opcional",
                    disabled: !camposExtrasOk
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.6fr)",
              gap: 12,
              marginTop: 12
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "E-mail" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    type: "email",
                    value: perfil.email,
                    onChange: (e) => {
                      atualizarCampo("email", e.target.value);
                      setNovoEmail(e.target.value);
                    },
                    placeholder: "seu@email.com"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Telefone" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: formatTelefone(perfil.telefone || ""),
                    onChange: (e) => atualizarCampo("telefone", formatTelefone(e.target.value)),
                    placeholder: "(00) 00000-0000"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "WhatsApp" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: formatTelefone(perfil.whatsapp || ""),
                    onChange: (e) => atualizarCampo("whatsapp", formatTelefone(e.target.value)),
                    placeholder: "(00) 00000-0000",
                    disabled: !camposExtrasOk
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Cidade" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: perfil.cidade || "",
                    onChange: (e) => atualizarCampo("cidade", e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Estado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: perfil.estado || "",
                    maxLength: 2,
                    onChange: (e) => atualizarCampo("estado", e.target.value.toUpperCase()),
                    placeholder: "UF"
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, alignItems: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", onClick: salvarPerfil, disabled: salvando, children: salvando ? "Salvando..." : "Salvar dados" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-config", style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "🔐 Dados de acesso" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "E-mail de login" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  value: novoEmail,
                  onChange: (e) => setNovoEmail(e.target.value),
                  type: "email"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: "Será necessário confirmar o novo e-mail." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-secondary", onClick: alterarEmail, disabled: salvando, children: "Atualizar e-mail" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginTop: 6, marginBottom: 4 }, children: "Alterar senha" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Nova senha" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "password",
                value: novaSenha,
                onChange: (e) => setNovaSenha(e.target.value),
                placeholder: "Mínimo 6 caracteres"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Confirmar senha" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "password",
                value: confirmaSenha,
                onChange: (e) => setConfirmaSenha(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, alignItems: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", onClick: alterarSenha, disabled: salvando, children: "Alterar senha" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { display: "flex", flexDirection: "column", minHeight: "100%" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "🏢 Empresa" }),
          empresaAtual ? /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { marginBottom: 12, lineHeight: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Empresa:" }),
            " ",
            empresaAtual.nome || "-",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "CNPJ:" }),
            " ",
            empresaAtual.cnpj || "-",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Endereço:" }),
            " ",
            perfil.company?.endereco || "-",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Telefone:" }),
            " ",
            perfil.company?.telefone || "-",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Cargo:" }),
            " ",
            perfil.cargo || "-"
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { marginBottom: 12 }, children: "Nenhuma empresa vinculada." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Trocar empresa (CNPJ)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: novoCnpj,
                onChange: (e) => setNovoCnpj(e.target.value),
                placeholder: "00.000.000/0000-00"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: "auto", alignItems: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", onClick: trocarEmpresa, disabled: salvando, children: "Trocar empresa" }) })
        ] })
      ] })
    ] })
  ] });
}

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const activePage = "perfil";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Meu Perfil", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">Meu Perfil</h1> <p class="page-subtitle">Atualize seus dados pessoais e de acesso.</p> ${renderComponent($$result2, "PerfilIsland", PerfilIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/PerfilIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/perfil/index.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/perfil/index.astro";
const $$url = "/perfil";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
