import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type Fornecedor = {
  id: string;
  nome_completo: string | null;
  nome_fantasia: string | null;
  localizacao: "brasil" | "exterior";
  cnpj: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  whatsapp: string | null;
  telefone_emergencia: string | null;
  responsavel: string | null;
  tipo_faturamento: string | null;
  principais_servicos: string | null;
  created_at: string | null;
};

type FornecedorForm = Omit<Fornecedor, "id" | "created_at">;

type CidadeBusca = {
  id: string;
  nome: string;
  subdivisao_nome: string | null;
  pais_nome?: string | null;
  subdivisao_id?: string | null;
};

const LOCALIZACAO_OPCOES = [
  { value: "brasil", label: "Brasil" },
  { value: "exterior", label: "Exterior" },
];

const TIPO_FATURAMENTO_OPCOES = [
  { value: "pre_pago", label: "Pré-Pago" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
];

const INITIAL_FORM: FornecedorForm = {
  nome_completo: "",
  nome_fantasia: "",
  localizacao: "brasil",
  cnpj: "",
  cep: "",
  cidade: "",
  estado: "",
  telefone: "",
  whatsapp: "",
  telefone_emergencia: "",
  responsavel: "",
  tipo_faturamento: "pre_pago",
  principais_servicos: "",
};

function formatFaturamento(value: string | null) {
  const option = TIPO_FATURAMENTO_OPCOES.find((opt) => opt.value === value);
  return option ? option.label : value || "-";
}

function formatLocalizacao(value: string | null) {
  if (value === "brasil") return "Brasil";
  if (value === "exterior") return "Exterior";
  return value || "-";
}

function normalizeSearchValue(value?: string | null) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatTelefoneValue(value: string) {
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

function formatCidadeLabel(cidade: CidadeBusca) {
  return cidade.subdivisao_nome ? `${cidade.nome} (${cidade.subdivisao_nome})` : cidade.nome;
}

export default function FornecedoresIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [form, setForm] = useState<FornecedorForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [cidadeBusca, setCidadeBusca] = useState("");
  const [resultadosCidade, setResultadosCidade] = useState<CidadeBusca[]>([]);
  const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = useState(false);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidadeBusca, setErroCidadeBusca] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user =
          sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !isMounted) return;

        const { data, error } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();
        if (!isMounted) return;
        if (error) {
          console.error("Erro ao buscar company_id dos fornecedores:", error);
          return;
        }
        setCompanyId(data?.company_id || null);
      } catch (error) {
        console.error("Erro ao determinar company_id dos fornecedores:", error);
      }
    }

    resolveCompany();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!companyId) return;
    carregarFornecedores();
  }, [companyId]);

  async function carregarFornecedores() {
    if (!companyId) return;
    setLoading(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .select(
          "id, nome_completo, nome_fantasia, localizacao, cidade, estado, telefone, whatsapp, responsavel, tipo_faturamento, principais_servicos, created_at"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFornecedores((data || []) as Fornecedor[]);
    } catch (error) {
      console.error(error);
      setErro("Erro ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  }

  function validarFormulario() {
    if (!form.nome_completo.trim()) return "Informe o nome completo.";
    if (!form.nome_fantasia.trim()) return "Informe o nome fantasia.";
    if (!form.cidade.trim()) return "Informe a cidade.";
    if (!form.estado.trim()) return "Informe o estado.";
    if (!form.telefone.trim()) return "Informe o telefone.";
    if (!form.whatsapp.trim()) return "Informe o WhatsApp.";
    if (!form.telefone_emergencia.trim()) return "Informe o telefone de emergência.";
    if (!form.responsavel.trim()) return "Informe o responsável.";
    if (!form.tipo_faturamento) return "Escolha o tipo de faturamento.";
    if (!form.principais_servicos.trim()) return "Descreva os principais serviços.";
    if (form.localizacao === "brasil" && !form.cnpj.trim()) return "Informe o CNPJ.";
    if (form.localizacao === "brasil" && !form.cep.trim()) return "Informe o CEP.";
    return null;
  }

  function abrirFormularioFornecedor() {
    setForm(INITIAL_FORM);
    setFormError(null);
    setEditandoId(null);
    setCidadeBusca("");
    setResultadosCidade([]);
    setMostrarSugestoesCidade(false);
    setErroCidadeBusca(null);
    setMostrarFormulario(true);
  }

  function fecharFormularioFornecedor() {
    setForm(INITIAL_FORM);
    setFormError(null);
    setEditandoId(null);
    setCidadeBusca("");
    setResultadosCidade([]);
    setMostrarSugestoesCidade(false);
    setErroCidadeBusca(null);
    setMostrarFormulario(false);
  }

  function iniciarEdicaoFornecedor(fornecedor: Fornecedor) {
    setForm({
      nome_completo: fornecedor.nome_completo || "",
      nome_fantasia: fornecedor.nome_fantasia || "",
      localizacao: fornecedor.localizacao || "brasil",
      cnpj: fornecedor.cnpj || "",
      cep: fornecedor.cep || "",
      cidade: fornecedor.cidade || "",
      estado: fornecedor.estado || "",
      telefone: fornecedor.telefone || "",
      whatsapp: fornecedor.whatsapp || "",
      telefone_emergencia: fornecedor.telefone_emergencia || "",
      responsavel: fornecedor.responsavel || "",
      tipo_faturamento: fornecedor.tipo_faturamento || "pre_pago",
      principais_servicos: fornecedor.principais_servicos || "",
    });
    setFormError(null);
    setEditandoId(fornecedor.id);
    setCidadeBusca(
      fornecedor.cidade
        ? fornecedor.estado
          ? `${fornecedor.cidade} (${fornecedor.estado})`
          : fornecedor.cidade
        : ""
    );
    setResultadosCidade([]);
    setMostrarSugestoesCidade(false);
    setErroCidadeBusca(null);
    setMostrarFormulario(true);
  }

  const podeSalvar = permissao !== "view" && permissoesNaoVazias(permissao);
  const termosBusca = normalizeSearchValue(busca);
  const fornecedoresFiltrados = useMemo(() => {
    if (!termosBusca) return fornecedores;
    return fornecedores.filter((f) => {
      const alvo = `${f.nome_fantasia || ""} ${f.nome_completo || ""}`.trim();
      return normalizeSearchValue(alvo).includes(termosBusca);
    });
  }, [fornecedores, termosBusca]);
  const fornecedoresExibidos = useMemo(() => {
    return busca.trim() ? fornecedoresFiltrados : fornecedoresFiltrados.slice(0, 5);
  }, [fornecedoresFiltrados, busca]);

  useEffect(() => {
    if (!mostrarSugestoesCidade) return;
    if (cidadeBusca.trim().length < 2) {
      setResultadosCidade([]);
      setErroCidadeBusca(null);
      setBuscandoCidade(false);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setBuscandoCidade(true);
        const { data, error } = await supabase.rpc("buscar_cidades", {
          q: cidadeBusca.trim(),
          limite: 10,
        });
        if (controller.signal.aborted) return;
        if (error) {
          console.error("Erro ao buscar cidades:", error);
          setErroCidadeBusca("Erro ao buscar cidades (RPC). Tentando fallback...");
          const { data: dataFallback, error: errorFallback } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_nome")
            .ilike("nome", `%${cidadeBusca.trim()}%`)
            .order("nome");
          if (errorFallback) {
            console.error("Erro no fallback de cidades:", errorFallback);
            setErroCidadeBusca("Erro ao buscar cidades.");
          } else {
            setResultadosCidade((dataFallback as CidadeBusca[]) || []);
            setErroCidadeBusca(null);
          }
        } else {
          setResultadosCidade((data as CidadeBusca[]) || []);
          setErroCidadeBusca(null);
        }
      } finally {
        if (!controller.signal.aborted) setBuscandoCidade(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [cidadeBusca, mostrarSugestoesCidade]);

  function selecionarCidade(cidade: CidadeBusca) {
    setForm((prev) => ({
      ...prev,
      cidade: cidade.nome || "",
      estado: cidade.subdivisao_nome || "",
    }));
    setCidadeBusca(formatCidadeLabel(cidade));
    setMostrarSugestoesCidade(false);
    setResultadosCidade([]);
    setErroCidadeBusca(null);
  }

  function handleCidadeChange(valor: string) {
    setCidadeBusca(valor);
    setMostrarSugestoesCidade(true);
    if (form.cidade || form.estado) {
      setForm((prev) => ({ ...prev, cidade: "", estado: "" }));
    }
  }

  function handleCidadeBlur() {
    setTimeout(() => {
      setMostrarSugestoesCidade(false);
      const texto = normalizeSearchValue(cidadeBusca);
      const atual = form.cidade
        ? form.estado
          ? `${form.cidade} (${form.estado})`
          : form.cidade
        : "";
      if (texto && normalizeSearchValue(atual) === texto) {
        setErroCidadeBusca(null);
        return;
      }
      const match = resultadosCidade.find((cidade) => {
        const label = formatCidadeLabel(cidade);
        return (
          normalizeSearchValue(label) === texto ||
          normalizeSearchValue(cidade.nome) === texto
        );
      });
      if (match) {
        selecionarCidade(match);
        return;
      }
      if (texto) {
        setErroCidadeBusca("Selecione uma cidade da lista.");
      } else {
        setErroCidadeBusca(null);
      }
      setForm((prev) => ({ ...prev, cidade: "", estado: "" }));
    }, 150);
  }

  async function salvarFornecedor() {
    if (!companyId) {
      setFormError("Não foi possível determinar sua empresa.");
      return;
    }
    if (!podeSalvar) {
      setFormError("Sua permissão não permite salvar fornecedores.");
      return;
    }
    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setFormError(erroValidacao);
      return;
    }
    try {
      setSalvando(true);
      setFormError(null);
      const payload = {
        ...form,
        company_id: companyId,
        tipo_faturamento: form.tipo_faturamento,
        principais_servicos: form.principais_servicos.trim(),
      };
      const { error } = editandoId
        ? await supabase.from("fornecedores").update(payload).eq("id", editandoId)
        : await supabase.from("fornecedores").insert(payload);
      if (error) throw error;
      setForm(INITIAL_FORM);
      await carregarFornecedores();
      fecharFormularioFornecedor();
    } catch (error) {
      console.error(error);
      setFormError(editandoId ? "Erro ao atualizar fornecedor." : "Erro ao criar fornecedor.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirFornecedor(fornecedor: Fornecedor) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir fornecedores.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este fornecedor?")) return;

    try {
      setExcluindoId(fornecedor.id);
      setErro(null);

      const { count, error: countError } = await supabase
        .from("produtos")
        .select("id", { count: "exact", head: true })
        .eq("fornecedor_id", fornecedor.id);
      if (countError) throw countError;

      if ((count ?? 0) > 0) {
        setErro("Não é possível excluir fornecedor com produtos vinculados.");
        return;
      }

      const { error } = await supabase
        .from("fornecedores")
        .delete()
        .eq("id", fornecedor.id);
      if (error) throw error;

      await carregarFornecedores();
    } catch (error) {
      console.error(error);
      setErro("Nao foi possivel excluir o fornecedor.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (loadingPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return <div>Você não possui acesso ao módulo de Cadastros.</div>;
  }

  return (
    <div className="page-content-wrap fornecedores-page">
      {!mostrarFormulario && (
        <div className="card-base mb-3 list-toolbar-sticky">
          <div
            className="form-row mobile-stack"
            style={{ gap: 12, gridTemplateColumns: "minmax(240px, 1fr) auto", alignItems: "flex-end" }}
          >
            <div className="form-group" style={{ flex: "1 1 320px" }}>
              <label className="form-label">Buscar fornecedor</label>
              <input
                className="form-input"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome fantasia ou contato..."
              />
            </div>
            {podeSalvar && (
              <div
                className="form-group mobile-stack-buttons"
                style={{ alignItems: "flex-end", justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={abrirFormularioFornecedor}
                  disabled={mostrarFormulario}
                >
                  Adicionar fornecedor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="card-base card-blue form-card" style={{ marginTop: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {editandoId ? "Editar fornecedor" : "Novo fornecedor"}
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Localização</label>
              <div style={{ display: "flex", gap: 12 }}>
                {LOCALIZACAO_OPCOES.map((opcao) => (
                  <label key={opcao.value} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="radio"
                      name="localizacao"
                      value={opcao.value}
                      checked={form.localizacao === opcao.value}
                      onChange={(e) => setForm((prev) => ({ ...prev, localizacao: e.target.value as "brasil" | "exterior" }))}
                      disabled={!podeSalvar}
                    />
                    {opcao.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

        <div className="form-row" style={{ gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Nome completo</label>
            <input
              className="form-input"
              value={form.nome_completo}
              onChange={(e) => setForm((prev) => ({ ...prev, nome_completo: e.target.value }))}
              disabled={!podeSalvar}
              placeholder="Razão social" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Nome fantasia</label>
            <input
              className="form-input"
              value={form.nome_fantasia}
              onChange={(e) => setForm((prev) => ({ ...prev, nome_fantasia: e.target.value }))}
              disabled={!podeSalvar}
              placeholder="Nome comercial" />
          </div>
        </div>

        {form.localizacao === "brasil" && (
          <div className="form-row" style={{ gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">CNPJ</label>
              <input
                className="form-input"
                value={form.cnpj}
                onChange={(e) => setForm((prev) => ({ ...prev, cnpj: e.target.value }))}
                disabled={!podeSalvar}
                placeholder="00.000.000/0000-00" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">CEP</label>
              <input
                className="form-input"
                value={form.cep}
                onChange={(e) => setForm((prev) => ({ ...prev, cep: e.target.value }))}
                disabled={!podeSalvar}
                placeholder="00000-000" />
            </div>
          </div>
        )}

        <div className="form-row" style={{ gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Cidade</label>
            <input
              className="form-input"
              value={cidadeBusca}
              onChange={(e) => handleCidadeChange(e.target.value)}
              onFocus={() => setMostrarSugestoesCidade(true)}
              onBlur={handleCidadeBlur}
              disabled={!podeSalvar}
              placeholder="Buscar cidade..." />
            {buscandoCidade && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>Buscando cidades...</div>
            )}
            {erroCidadeBusca && !buscandoCidade && (
              <div style={{ fontSize: 12, color: "#dc2626" }}>{erroCidadeBusca}</div>
            )}
            {mostrarSugestoesCidade && (
              <div
                className="card-base"
                style={{
                  marginTop: 4,
                  maxHeight: 180,
                  overflowY: "auto",
                  padding: 6,
                  border: "1px solid #e5e7eb",
                }}
              >
                {resultadosCidade.length === 0 && !buscandoCidade && cidadeBusca.trim().length >= 2 && (
                  <div style={{ padding: "4px 6px", color: "#6b7280" }}>Nenhuma cidade encontrada.</div>
                )}
                {resultadosCidade.map((cidade) => {
                  const label = formatCidadeLabel(cidade);
                  return (
                    <button
                      key={cidade.id}
                      type="button"
                      className="btn btn-light"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        marginBottom: 4,
                        background:
                          form.cidade === cidade.nome ? "#e0f2fe" : "#fff",
                        borderColor:
                          form.cidade === cidade.nome ? "#38bdf8" : "#e5e7eb",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selecionarCidade(cidade);
                      }}
                    >
                      {label}
                      {cidade.pais_nome ? (
                        <span style={{ color: "#6b7280", marginLeft: 6 }}>- {cidade.pais_nome}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Estado</label>
            <input
              className="form-input"
              value={form.estado}
              readOnly
              disabled
              placeholder="UF / região" />
          </div>
        </div>

        <div className="form-row mobile-stack" style={{ gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Telefone</label>
            <input
              className="form-input"
              value={form.telefone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, telefone: formatTelefoneValue(e.target.value) }))
              }
              disabled={!podeSalvar}
              placeholder="(00) 0000-0000" />
          </div>
        </div>

        <div className="form-row mobile-stack" style={{ gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">WhatsApp</label>
            <input
              className="form-input"
              value={form.whatsapp}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, whatsapp: formatTelefoneValue(e.target.value) }))
              }
              disabled={!podeSalvar}
              placeholder="+55 00 00000-0000" />
          </div>
        </div>

        <div className="form-row mobile-stack" style={{ gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Telefone emergência</label>
            <input
              className="form-input"
              value={form.telefone_emergencia}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  telefone_emergencia: formatTelefoneValue(e.target.value),
                }))
              }
              disabled={!podeSalvar}
              placeholder="Contato alternativo" />
          </div>
        </div>

        <div className="form-row mobile-stack" style={{ gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Responsável</label>
            <input
              className="form-input"
              value={form.responsavel}
              onChange={(e) => setForm((prev) => ({ ...prev, responsavel: e.target.value }))}
              disabled={!podeSalvar}
              placeholder="Pessoa de contato" />
          </div>
        </div>

        <div className="form-row" style={{ gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Tipo de faturamento</label>
            <select
              className="form-select"
              value={form.tipo_faturamento}
              onChange={(e) => setForm((prev) => ({ ...prev, tipo_faturamento: e.target.value }))}
              disabled={!podeSalvar}
            >
              {TIPO_FATURAMENTO_OPCOES.map((opcao) => (
                <option key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Principais serviços</label>
          <textarea
            className="form-textarea"
            value={form.principais_servicos}
            onChange={(e) => setForm((prev) => ({ ...prev, principais_servicos: e.target.value }))}
            disabled={!podeSalvar}
            placeholder="Descreva BR/EX serviços oferecidos"
            rows={3}
          />
        </div>

          <div className="mobile-stack-buttons" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={salvarFornecedor}
              disabled={salvando || !podeSalvar}
            >
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar fornecedor"}
            </button>
            <button
              type="button"
              className="btn btn-light"
              onClick={fecharFormularioFornecedor}
              disabled={salvando}
            >
              Cancelar
            </button>
          </div>

          {formError && <div style={{ color: "red", marginTop: 8 }}>{formError}</div>}
        </div>
      )}

      {!mostrarFormulario && (
        <>
          {erro && <div style={{ color: "red", marginBottom: 8 }}>{erro}</div>}
          <div
            className="table-container overflow-x-auto"
            style={{ maxHeight: "65vh", overflowY: "auto" }}
          >
            <table className="table-default table-header-teal table-mobile-cards min-w-[720px] fornecedores-table">
              <thead>
                <tr>
                  <th>Nome fantasia</th>
                  <th>Local</th>
                  <th>Faturamento</th>
                  <th>Telefone</th>
                  <th>WhatsApp</th>
                  <th>Telefone emergência</th>
                  <th>Serviços</th>
                  <th className="th-actions" style={{ textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8}>Carregando fornecedores...</td>
                  </tr>
                )}
                {!loading && fornecedoresExibidos.length === 0 && (
                  <tr>
                    <td colSpan={8}>Nenhum fornecedor cadastrado.</td>
                  </tr>
                )}
                {!loading &&
                  fornecedoresExibidos.map((fornecedor) => (
                  <tr key={fornecedor.id}>
                    <td data-label="Nome fantasia">
                      {fornecedor.nome_fantasia || fornecedor.nome_completo || "-"}
                    </td>
                    <td data-label="Local">
                      {formatLocalizacao(fornecedor.localizacao)}
                      {fornecedor.cidade ? ` • ${fornecedor.cidade}` : ""}
                      {fornecedor.estado ? `/${fornecedor.estado}` : ""}
                    </td>
                    <td data-label="Faturamento">
                      {formatFaturamento(fornecedor.tipo_faturamento)}
                    </td>
                    <td data-label="Telefone">{fornecedor.telefone || "-"}</td>
                    <td data-label="WhatsApp">{fornecedor.whatsapp || "-"}</td>
                    <td data-label="Telefone emergência">{fornecedor.telefone_emergencia || "-"}</td>
                    <td data-label="Serviços" style={{ maxWidth: 240, whiteSpace: "normal" }}>
                      {fornecedor.principais_servicos
                        ? fornecedor.principais_servicos.length > 80
                          ? `${fornecedor.principais_servicos.slice(0, 80)}...`
                          : fornecedor.principais_servicos
                        : "-"}
                    </td>
                    <td className="th-actions" data-label="Ações">
                      <div className="action-buttons">
                        {podeSalvar && (
                          <button
                            className="btn-icon"
                            title="Editar"
                            onClick={() => iniciarEdicaoFornecedor(fornecedor)}
                          >
                            ✏️
                          </button>
                        )}
                        {permissao === "admin" && (
                          <button
                            className="btn-icon btn-danger"
                            title="Excluir"
                            onClick={() => excluirFornecedor(fornecedor)}
                            disabled={excluindoId === fornecedor.id}
                          >
                            {excluindoId === fornecedor.id ? "..." : "🗑️"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function permissoesNaoVazias(value: string) {
  return value && value !== "none";
}
