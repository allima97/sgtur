import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

type Viagem = {
  id: string;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  origem: string | null;
  destino: string | null;
  responsavel_user_id: string | null;
};

const STATUS_OPCOES = [
  { value: "", label: "Todas" },
  { value: "planejada", label: "Planejada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "em_viagem", label: "Em viagem" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

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
  const [cadastroForm, setCadastroForm] = useState({
    origem: "",
    destino: "",
    data_inicio: "",
    data_fim: "",
    status: "planejada",
  });
  type CidadeSugestao = {
    nome: string;
    subdivisao_nome?: string | null;
    pais_nome?: string | null;
  };
  const [cidades, setCidades] = useState<CidadeSugestao[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
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

  async function buscar() {
    try {
      setLoading(true);
      setErro(null);

      let query = supabase
        .from("viagens")
        .select("id, data_inicio, data_fim, status, origem, destino, responsavel_user_id")
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
      setFormError("Não foi possível determinar sua empresa.");
      return;
    }
    if (!cadastroForm.origem || !cadastroForm.destino || !cadastroForm.data_inicio) {
      setFormError("Origem, destino e data de início são obrigatórios.");
      return;
    }
    try {
      setSavingViagem(true);
      setFormError(null);
      const payload = {
        company_id: companyId,
        responsavel_user_id: userId,
        origem: cadastroForm.origem.trim(),
        destino: cadastroForm.destino.trim(),
        data_inicio: cadastroForm.data_inicio,
        data_fim: cadastroForm.data_fim || null,
        status: cadastroForm.status,
      };
      const { error } = await supabase.from("viagens").insert(payload);
      if (error) throw error;
      setCadastroForm({
        origem: "",
        destino: "",
        data_inicio: "",
        data_fim: "",
        status: "planejada",
      });
      setShowForm(false);
      buscar();
    } catch (e) {
      console.error(e);
      setFormError("Erro ao criar viagem.");
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

  if (!ativo && !loadingPerm) {
    return <div>Você não possui acesso ao módulo de Operação/Viagens.</div>;
  }

  return (
      <div className="card-base card-purple">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {podeCriar && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600 }}>Viagens</div>
                  <button
                    className="btn btn-primary"
                    type="button"
                onClick={() => setShowForm((prev) => !prev)}
              >
                {showForm ? "Cancelar" : "Nova viagem"}
              </button>
            </div>
          )}
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
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={cadastroForm.status}
                    onChange={(e) => setCadastroForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="planejada">Planejada</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="em_viagem">Em viagem</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
                <div className="form-group" style={{ alignSelf: "flex-end" }}>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={criarViagem}
                    disabled={savingViagem}
                  >
                    {savingViagem ? "Salvando..." : "Criar viagem"}
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
            <label className="form-label">Início a partir de</label>
            <input
              type="date"
              className="form-input"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Início até</label>
            <input
              type="date"
              className="form-input"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ alignSelf: "flex-end" }}>
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
                  <td>{v.responsavel_user_id || "-"}</td>
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
