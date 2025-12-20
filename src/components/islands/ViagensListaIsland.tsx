import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type Viagem = {
  id: string;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  origem: string | null;
  destino: string | null;
  responsavel_user_id: string | null;
  cliente_id: string | null;
  clientes?: { nome: string | null } | null;
  responsavel?: { nome_completo?: string | null } | null;
};

const STATUS_OPCOES = [
  { value: "", label: "Todas" },
  { value: "planejada", label: "Planejada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "em_viagem", label: "Em viagem" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

const initialCadastroForm = {
  origem: "",
  destino: "",
  data_inicio: "",
  data_fim: "",
  status: "planejada",
  cliente_id: "",
};

export default function ViagensListaIsland() {
  const { permissao, loading: loadingPerm, ativo } = usePermissao("Operacao");
  const podeVer = permissao !== "none";
  const podeCriar =
    permissao === "create" ||
    permissao === "edit" ||
    permissao === "delete" ||
    permissao === "admin";

  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingViagem, setSavingViagem] = useState(false);
  const [cadastroForm, setCadastroForm] = useState(() => ({ ...initialCadastroForm }));
  type CidadeSugestao = {
    nome: string;
    subdivisao_nome?: string | null;
    pais_nome?: string | null;
  };
  const [cidades, setCidades] = useState<CidadeSugestao[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string; cpf?: string | null }[]>([]);
  const [clientesErro, setClientesErro] = useState<string | null>(null);
  const [buscandoCidades, setBuscandoCidades] = useState(false);
  const [erroCidades, setErroCidades] = useState<string | null>(null);
  const cidadesAbort = useRef<AbortController | null>(null);
  const cidadesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formatCidadeLabel = (cidade: CidadeSugestao) => {
    const partes = [cidade.nome];
    if (cidade.subdivisao_nome) partes.push(cidade.subdivisao_nome);
    if (cidade.pais_nome) partes.push(cidade.pais_nome);
    return partes.join(" • ");
  };

  useEffect(() => {
    if (!loadingPerm && podeVer) {
      buscar();
    }
  }, [loadingPerm, podeVer, statusFiltro, inicio, fim]);

  useEffect(() => {
    async function resolveUser() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user || null;
      if (!user) {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        setUserId(data.user.id);
        const { data: row } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", data.user.id)
          .maybeSingle();
        setCompanyId(row?.company_id || null);
      } else {
        setUserId(user.id);
        const { data: row } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();
        setCompanyId(row?.company_id || null);
      }
    }
    resolveUser();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    async function carregarClientes() {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("id, nome, cpf")
          .eq("company_id", companyId)
          .order("nome", { ascending: true })
          .limit(200);
        if (error) throw error;
        setClientes((data || []) as { id: string; nome: string; cpf?: string | null }[]);
        setClientesErro(null);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        setClientesErro("Não foi possível carregar os clientes.");
      }
    }
    carregarClientes();
  }, [companyId]);

  useEffect(() => {
    carregarSugestoes("");
    return () => {
      if (cidadesAbort.current) {
        cidadesAbort.current.abort();
      }
      if (cidadesTimeout.current) {
        clearTimeout(cidadesTimeout.current);
      }
    };
  }, []);

  async function carregarSugestoes(term: string) {
    if (cidadesAbort.current) {
      cidadesAbort.current.abort();
    }
    const controller = new AbortController();
    cidadesAbort.current = controller;
    try {
      setBuscandoCidades(true);
      setErroCidades(null);
      const search = term.trim();
      const limite = search.length === 0 ? 200 : 50;
      let cidadesData: CidadeSugestao[] = [];
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: search, limite },
          { signal: controller.signal }
        );
        if (error) throw error;
        cidadesData = (data || []) as CidadeSugestao[];
      } catch (rpcError) {
        if (controller.signal.aborted) return;
        console.warn("RPC buscar_cidades falhou:", rpcError);
        let fallbackQuery = supabase
          .from("cidades")
          .select("nome")
          .order("nome")
          .limit(limite);
        if (search.length > 0) {
          fallbackQuery = fallbackQuery.ilike("nome", `%${search}%`);
        }
        const fallback = await fallbackQuery;
        if (fallback.error) throw fallback.error;
        cidadesData = (fallback.data || []).map((c) => ({ nome: c.nome }));
      }

      if (controller.signal.aborted) return;

      const unique = new Map<string, CidadeSugestao>();
      cidadesData.forEach((cidade) => {
        if (!cidade?.nome) return;
        const key = `${cidade.nome}|${cidade.pais_nome || ""}|${cidade.subdivisao_nome || ""}`;
        if (!unique.has(key)) unique.set(key, cidade);
      });
      setCidades(Array.from(unique.values()));
    } catch (e) {
      if (!controller.signal.aborted) {
        console.error("Erro ao buscar cidades:", e);
        setErroCidades("Não foi possível carregar as cidades.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setBuscandoCidades(false);
      }
    }
  }

  function agendarBuscaCidades(term: string) {
    if (cidadesTimeout.current) {
      clearTimeout(cidadesTimeout.current);
    }
    cidadesTimeout.current = setTimeout(() => {
      carregarSugestoes(term);
    }, 250);
  }

  function resetCadastroForm() {
    setCadastroForm({ ...initialCadastroForm });
    setFormError(null);
  }

  function abrirFormularioViagem() {
    resetCadastroForm();
    setShowForm(true);
  }

  function fecharFormularioViagem() {
    resetCadastroForm();
    setShowForm(false);
  }

  async function buscar() {
    try {
      setLoading(true);
      setErro(null);

      let query = supabase
        .from("viagens")
        .select(
          "id, data_inicio, data_fim, status, origem, destino, responsavel_user_id, cliente_id, clientes (nome), responsavel:users!responsavel_user_id (nome_completo)"
        )
        .order("data_inicio", { ascending: true });

      if (statusFiltro) {
        query = query.eq("status", statusFiltro);
      }
      if (inicio) {
        query = query.gte("data_inicio", inicio);
      }
      if (fim) {
        query = query.lte("data_inicio", fim);
      }

      const { data, error } = await query;
      if (error) throw error;
      setViagens((data || []) as Viagem[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar viagens.");
    } finally {
      setLoading(false);
    }
  }

  async function criarViagem() {
    if (!podeCriar) return;
    if (!companyId || !userId) {
      setFormError("NÇőo foi possÇ§vel determinar sua empresa.");
      return;
    }
    if (!cadastroForm.cliente_id) {
      setFormError("Selecione o cliente responsÂvel.");
      return;
    }
    if (!cadastroForm.origem || !cadastroForm.destino || !cadastroForm.data_inicio) {
      setFormError("Origem, destino e data de inÃ­cio sÇőo obrigatÃ³rios.");
      return;
    }

    let orcamentoId: string | null = null;
    try {
      setSavingViagem(true);
      setFormError(null);

      const origemLabel = cadastroForm.origem.trim();
      const destinoLabel = cadastroForm.destino.trim();
      const { data: orcamentoData, error: orcamentoError } = await supabase
        .from("orcamentos")
        .insert({
          cliente_id: cadastroForm.cliente_id,
          status: "novo",
          data_viagem: cadastroForm.data_inicio,
          notas: `Viagem criada via Operacao: ${origemLabel} -> ${destinoLabel}`,
        })
        .select("id")
        .single();

      if (orcamentoError) throw orcamentoError;
      orcamentoId = orcamentoData?.id || null;
      if (!orcamentoId) {
        throw new Error("Nao foi possivel vincular um orcamento.");
      }

      const payload = {
        company_id: companyId,
        responsavel_user_id: userId,
        cliente_id: cadastroForm.cliente_id,
        origem: origemLabel,
        destino: destinoLabel,
        data_inicio: cadastroForm.data_inicio,
        data_fim: cadastroForm.data_fim || null,
        status: cadastroForm.status,
        orcamento_id: orcamentoId,
      };
      const { error } = await supabase.from("viagens").insert(payload);
      if (error) throw error;

      resetCadastroForm();
      setShowForm(false);
      buscar();
    } catch (e: unknown) {
      console.error(e);
      if (orcamentoId) {
        const { error: cleanupError } = await supabase.from("orcamentos").delete().eq("id", orcamentoId);
        if (cleanupError) {
          console.warn("Nao foi possivel remover o orcamento temporario:", cleanupError);
        }
      }
      const errorMessage =
        e && typeof e === "object" && e !== null && "message" in e && typeof (e as { message?: string }).message === "string"
          ? (e as { message?: string }).message
          : null;
      setFormError(errorMessage || "Erro ao criar viagem.");
    } finally {
      setSavingViagem(false);
    }
  }

  const proximasViagens = useMemo(() => {
    return [...viagens].sort((a, b) => {
      const da = a.data_inicio || "";
      const db = b.data_inicio || "";
      if (da === db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    });
  }, [viagens]);

  if (loadingPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return <div>Você não possui acesso ao módulo de Operação/Viagens.</div>;
  }

  return (
      <div className="card-base card-purple">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {showForm && (
            <div className="card-base card-blue" style={{ padding: 16 }}>
              <datalist id="cidades-list">
                {cidades.map((cidade) => (
                  <option
                    key={`${cidade.nome}-${cidade.subdivisao_nome || ""}-${cidade.pais_nome || ""}`}
                    value={cidade.nome}
                    label={formatCidadeLabel(cidade)}
                  />
                ))}
              </datalist>
              {buscandoCidades && <small style={{ color: "#6366f1" }}>Buscando cidades...</small>}
              {erroCidades && <small style={{ color: "red" }}>{erroCidades}</small>}
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <select
                  className="form-select"
                  value={cadastroForm.cliente_id}
                  onChange={(e) =>
                    setCadastroForm((prev) => ({ ...prev, cliente_id: e.target.value }))
                  }
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                      {cliente.cpf ? ` (${cliente.cpf})` : ""}
                    </option>
                  ))}
                </select>
                {clientesErro && (
                  <small style={{ color: "red" }}>{clientesErro}</small>
                )}
              </div>
              <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Origem</label>
                    <input
                      className="form-input"
                      list="cidades-list"
                      value={cadastroForm.origem}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCadastroForm((prev) => ({ ...prev, origem: value }));
                        agendarBuscaCidades(value);
                      }}
                      placeholder="Cidade de origem"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destino</label>
                    <input
                      className="form-input"
                      list="cidades-list"
                      value={cadastroForm.destino}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCadastroForm((prev) => ({ ...prev, destino: value }));
                        agendarBuscaCidades(value);
                      }}
                      placeholder="Cidade de destino"
                    />
                  </div>
                <div className="form-group">
                  <label className="form-label">Data início</label>
                  <input
                    type="date"
                    className="form-input"
                    value={cadastroForm.data_inicio}
                    onChange={(e) => setCadastroForm((prev) => ({ ...prev, data_inicio: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data fim</label>
                  <input
                    type="date"
                    className="form-input"
                    value={cadastroForm.data_fim}
                    onChange={(e) => setCadastroForm((prev) => ({ ...prev, data_fim: e.target.value }))}
                  />
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
              >
                {STATUS_OPCOES.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Inicio</label>
              <input
                type="date"
                className="form-input"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Final</label>
              <input
                type="date"
                className="form-input"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            </div>
                <div
                  className="form-row"
                  style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-start" }}
                >
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={criarViagem}
                    disabled={savingViagem}
                  >
                    {savingViagem ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    className="btn btn-light"
                    type="button"
                    onClick={fecharFormularioViagem}
                    disabled={savingViagem}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
              {formError && <div style={{ color: "red" }}>{formError}</div>}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
              >
                {STATUS_OPCOES.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Início</label>
              <input
                type="date"
                className="form-input"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Final</label>
              <input
                type="date"
                className="form-input"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ alignSelf: "flex-end", display: "flex", gap: 8 }}>
              {podeCriar && (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={abrirFormularioViagem}
                  disabled={showForm}
                >
                  Nova viagem
                </button>
              )}
              <button className="btn btn-light" type="button" onClick={buscar} disabled={loading}>
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
          </div>

        {erro && <div style={{ color: "red" }}>{erro}</div>}

        <div className="table-container overflow-x-auto">
          <table className="table-default min-w-[760px]">
              <thead>
                <tr>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Status</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Cliente</th>
                  <th>Responsável</th>
                  <th>Ver</th>
                </tr>
              </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}>Carregando viagens...</td>
                </tr>
              )}
              {!loading && proximasViagens.length === 0 && (
                <tr>
                  <td colSpan={7}>Nenhuma viagem encontrada.</td>
                </tr>
              )}
              {proximasViagens.map((v) => (
                <tr key={v.id}>
                  <td>{v.data_inicio ? new Date(v.data_inicio).toLocaleDateString("pt-BR") : "-"}</td>
                  <td>{v.data_fim ? new Date(v.data_fim).toLocaleDateString("pt-BR") : "-"}</td>
                  <td>{v.status || "-"}</td>
                  <td>{v.origem || "-"}</td>
                  <td>{v.destino || "-"}</td>
                  <td>{v.clientes?.nome || "-"}</td>
                  <td>{v.responsavel?.nome_completo || v.responsavel_user_id || "-"}</td>
                  <td>
                    <a className="btn btn-light" href={`/operacao/viagens/${v.id}`}>
                      Abrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
