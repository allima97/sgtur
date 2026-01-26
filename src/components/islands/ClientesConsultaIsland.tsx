import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import { construirLinkWhatsApp } from "../../lib/whatsapp";
import ConfirmDialog from "../ui/ConfirmDialog";

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  whatsapp?: string | null;
  company_id?: string | null;
};

export default function ClientesConsultaIsland() {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("Clientes");
  const podeCriar = can("Clientes", "create");

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [carregouTodos, setCarregouTodos] = useState(false);
  const [historicoCliente, setHistoricoCliente] = useState<Cliente | null>(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoVendas, setHistoricoVendas] = useState<
    {
      id: string;
      data_lancamento: string | null;
      data_embarque: string | null;
      destino_nome: string;
      destino_cidade_nome?: string;
      valor_total: number;
      valor_taxas: number;
    }[]
  >([]);
  const [historicoOrcamentos, setHistoricoOrcamentos] = useState<
    {
      id: string;
      data_orcamento: string | null;
      status: string | null;
      valor: number | null;
      produto_nome?: string | null;
    }[]
  >([]);

  useEffect(() => {
    let mounted = true;
    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user = sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !mounted) return;
        const { data, error } = await supabase.from("users").select("company_id").eq("id", user.id).maybeSingle();
        if (error) {
          console.error(error);
          return;
        }
        if (!mounted) return;
        setCompanyId(data?.company_id || null);
      } catch (e) {
        console.error(e);
      }
    }
    resolveCompany();
    return () => { mounted = false; };
  }, []);

  async function carregar(todos = false) {
    if (!podeVer || !companyId) return;
    try {
      setLoading(true);
      setErro(null);
      let query = supabase
        .from("clientes")
        .select("id, nome, cpf, telefone, email, whatsapp, company_id")
        .eq("company_id", companyId)
        .order(todos ? "nome" : "created_at", { ascending: todos });
      if (!todos) {
        query = query.limit(5);
      }
      const { data, error } = await query;
      if (error) throw error;
      setClientes((data || []) as Cliente[]);
      setCarregouTodos(todos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadingPerm && podeVer && companyId) carregar(false);
  }, [loadingPerm, podeVer, companyId]);
  useEffect(() => {
    if (busca.trim() && !carregouTodos && podeVer && companyId) {
      carregar(true);
    } else if (!busca.trim() && carregouTodos && podeVer && companyId) {
      carregar(false);
    }
  }, [busca, carregouTodos, podeVer, companyId]);

  const filtrados = useMemo(() => {
    const q = (busca || "").toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter((c) =>
      (c.nome || "").toLowerCase().includes(q) ||
      (c.cpf || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }, [clientes, busca]);
  const clientesExibidos = useMemo(() => {
    return busca.trim() ? filtrados : filtrados.slice(0, 5);
  }, [filtrados, busca]);

  const podeEditar = can("Clientes", "edit");
  const podeExcluir = can("Clientes", "delete");

  async function excluirCliente(id: string) {
    if (!podeExcluir) {
      window.alert("Você não tem permissão para excluir clientes.");
      return;
    }
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
      setClientes((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      window.alert("Erro ao excluir cliente.");
    }
  }

  function solicitarExclusao(cliente: Cliente) {
    if (!podeExcluir) {
      window.alert("Você não tem permissão para excluir clientes.");
      return;
    }
    setClienteParaExcluir(cliente);
  }

  async function confirmarExclusaoCliente() {
    if (!clienteParaExcluir) return;
    await excluirCliente(clienteParaExcluir.id);
    setClienteParaExcluir(null);
  }

  function editarCliente(id: string) {
    if (!podeEditar) {
      window.alert("Você não tem permissão para editar clientes.");
      return;
    }
    window.location.href = `/clientes/cadastro?id=${id}`;
  }

  function abrirHistorico(id: string, nome?: string) {
    const cliente = clientes.find((c) => c.id === id);
    if (!cliente) return;
    setHistoricoCliente(cliente);
    setHistoricoVendas([]);
    setHistoricoOrcamentos([]);
    setLoadingHistorico(true);
    (async () => {
      try {
        const { data: vendasData } = await supabase
          .from("vendas")
          .select("id, data_lancamento, data_embarque, destino_cidade_id, destinos:produtos!destino_id (nome, cidade_id)")
          .eq("cliente_id", id)
          .order("data_lancamento", { ascending: false });

        let vendasFmt: {
          id: string;
          data_lancamento: string | null;
          data_embarque: string | null;
          destino_nome: string;
          destino_cidade_nome?: string;
          valor_total: number;
          valor_taxas: number;
        }[] = [];

        if (vendasData && vendasData.length > 0) {
          const vendaIds = vendasData.map((v: any) => v.id);
          const cidadeIds = Array.from(
            new Set(
              vendasData
                .map((v: any) => v.destino_cidade_id || v.destinos?.cidade_id)
                .filter((cid: string | null | undefined): cid is string => Boolean(cid))
            )
          );
          const { data: recibosData } = await supabase
            .from("vendas_recibos")
            .select("venda_id, valor_total, valor_taxas")
            .in("venda_id", vendaIds);

          let cidadesMap: Record<string, string> = {};
          if (cidadeIds.length > 0) {
            const { data: cidadesData } = await supabase
              .from("cidades")
              .select("id, nome")
              .in("id", cidadeIds);
            cidadesMap = Object.fromEntries((cidadesData || []).map((c: any) => [c.id, c.nome || ""]));
          }

          vendasFmt = vendasData.map((v: any) => {
            const recs = (recibosData || []).filter((r: any) => r.venda_id === v.id);
            const total = recs.reduce((acc: number, r: any) => acc + (r.valor_total || 0), 0);
            const taxas = recs.reduce((acc: number, r: any) => acc + (r.valor_taxas || 0), 0);
            const cidadeId = v.destino_cidade_id || v.destinos?.cidade_id || null;
            return {
              id: v.id,
              data_lancamento: v.data_lancamento || null,
              data_embarque: v.data_embarque || null,
              destino_nome: v.destinos?.nome || "",
              destino_cidade_nome: cidadeId ? cidadesMap[cidadeId] || "" : "",
              valor_total: total,
              valor_taxas: taxas,
            };
          });
        }

        const { data: quotesData } = await supabase
          .from("quote")
          .select("id, created_at, status, status_negociacao, total, client_id, quote_item (title, item_type)")
          .eq("client_id", id)
          .order("created_at", { ascending: false });

        const orcFmt =
          quotesData?.map((q: any) => ({
            id: q.id,
            data_orcamento: q.created_at || null,
            status: q.status_negociacao || q.status || null,
            valor: q.total ?? null,
            produto_nome: q.quote_item?.[0]?.title || q.quote_item?.[0]?.item_type || null,
          })) || [];

        setHistoricoVendas(vendasFmt);
        setHistoricoOrcamentos(orcFmt);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistorico(false);
      }
    })();
  }

  function fecharHistorico() {
    setHistoricoCliente(null);
    setHistoricoVendas([]);
    setHistoricoOrcamentos([]);
    setLoadingHistorico(false);
  }

  if (loadingPerm) return <div className="clientes-page"><div className="card-base card-config">Carregando contexto...</div></div>;
  if (!podeVer) return <div className="clientes-page">Você não possui acesso ao módulo de Clientes.</div>;

  return (
    <>
    <div className={`clientes-page${podeCriar ? " has-mobile-actionbar" : ""}`}>
      <div className="card-base card-blue mb-3 list-toolbar-sticky">
        <div className="form-row" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group flex-1 min-w-0">
            <label className="form-label">Buscar cliente</label>
            <input className="form-input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, CPF ou e-mail" />
          </div>
          {podeCriar && (
            <div className="hidden sm:flex sm:items-end sm:ml-auto">
              <a href="/clientes/cadastro?novo=1" className="btn btn-primary">
                Adicionar cliente
              </a>
            </div>
          )}
        </div>
      </div>

      {erro && (<div className="card-base card-config mb-3"><strong>{erro}</strong></div>)}

      <div className="table-container overflow-x-auto" style={{ maxHeight: "65vh", overflowY: "auto" }}>
        <table className="table-default table-header-blue clientes-table table-mobile-cards">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th className="th-actions" style={{ textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4}>Carregando...</td></tr>
            )}
            {!loading && clientesExibidos.length === 0 && (
              <tr><td colSpan={4}>Nenhum cliente encontrado.</td></tr>
            )}
            {!loading && clientesExibidos.map((c) => (
              <tr key={c.id}>
                <td data-label="Nome">{c.nome}</td>
                <td data-label="CPF">{c.cpf}</td>
                <td data-label="Telefone">{c.telefone || "-"}</td>
                <td data-label="E-mail">{c.email || "-"}</td>
                <td className="th-actions" data-label="Ações">
                  <div className="action-buttons">
                    {(() => {
                      const whatsappLink = construirLinkWhatsApp(c.whatsapp || c.telefone || "");
                      if (whatsappLink) {
                        return (
                          <a className="btn-icon" href={whatsappLink} title="Abrir WhatsApp" target="_blank" rel="noreferrer">💬</a>
                        );
                      }
                      return null;
                    })()}

                    <button className="btn-icon" onClick={() => abrirHistorico(c.id, c.nome)} title="Histórico">🗂️</button>

                    {podeEditar && (
                      <button className="btn-icon" onClick={() => editarCliente(c.id)} title="Editar">✏️</button>
                    )}

                    {podeExcluir && (
                      <button className="btn-icon btn-danger" onClick={() => solicitarExclusao(c)} title="Excluir">🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {podeCriar && (
        <div className="mobile-actionbar sm:hidden">
          <a href="/clientes/cadastro?novo=1" className="btn btn-primary">
            Adicionar cliente
          </a>
        </div>
      )}
    </div>
    {historicoCliente && (
      <div className="modal-backdrop">
        <div className="modal-panel historico-viagens-modal" style={{ maxWidth: 1000, width: "95vw" }}>
          <div className="modal-header">
            <div className="historico-viagens-header">
              <div
                className="modal-title"
                style={{ color: "#1d4ed8", fontSize: "1.2rem", fontWeight: 800 }}
              >
                {historicoCliente.nome}
              </div>
              <div className="historico-viagens-subtitle">
                Histórico de Viagens e Orçamentos
              </div>
            </div>
            <button className="btn-ghost" onClick={fecharHistorico}>✕</button>
          </div>

          <div className="modal-body">
            {loadingHistorico && <p>Carregando histórico...</p>}

            {!loadingHistorico && (
              <>
                <div className="mb-2">
                  <div className="card-base mb-2 historico-viagens-section-title" style={{ padding: "12px 16px" }}>
                    <h4 style={{ margin: 0 }}>Vendas</h4>
                  </div>
                  <div className="table-container overflow-x-auto">
                    <table className="table-default table-header-blue table-mobile-cards min-w-[720px]">
                      <thead>
                        <tr>
                          <th>Data Lançamento</th>
                          <th>Destino</th>
                          <th>Embarque</th>
                          <th>Valor</th>
                          <th>Taxas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoVendas.length === 0 && (
                          <tr>
                            <td colSpan={5}>Nenhuma venda encontrada.</td>
                          </tr>
                        )}
                        {historicoVendas.map((v) => (
                          <tr key={v.id}>
                            <td data-label="Data Lançamento">
                              {v.data_lancamento
                                ? new Date(v.data_lancamento).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td data-label="Destino">{v.destino_nome || "-"}</td>
                            <td data-label="Embarque">
                              {v.data_embarque
                                ? new Date(v.data_embarque).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td data-label="Valor">
                              {v.valor_total.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td data-label="Taxas">
                              {v.valor_taxas.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="card-base mb-2 historico-viagens-section-title" style={{ padding: "12px 16px" }}>
                    <h4 style={{ margin: 0 }}>Orçamentos</h4>
                  </div>
                  <div className="table-container overflow-x-auto">
                    <table className="table-default table-header-blue table-mobile-cards min-w-[720px]">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Status</th>
                          <th>Produto</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoOrcamentos.length === 0 && (
                          <tr>
                            <td colSpan={4}>Nenhum orçamento encontrado.</td>
                          </tr>
                        )}
                        {historicoOrcamentos.map((o) => (
                          <tr key={o.id}>
                            <td data-label="Data">
                              {o.data_orcamento
                                ? new Date(o.data_orcamento).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td data-label="Status">{o.status || "-"}</td>
                            <td data-label="Produto">{o.produto_nome || "-"}</td>
                            <td data-label="Valor">
                              {o.valor !== null && o.valor !== undefined
                                ? o.valor.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer mobile-stack-buttons">
            <button className="btn btn-primary" onClick={fecharHistorico}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}
    <ConfirmDialog
      open={Boolean(clienteParaExcluir)}
      title="Excluir cliente"
      message={`Tem certeza que deseja excluir ${clienteParaExcluir?.nome || "este cliente"}?`}
      confirmLabel="Excluir"
      confirmVariant="danger"
      onCancel={() => setClienteParaExcluir(null)}
      onConfirm={confirmarExclusaoCliente}
    />
    </>
  );
}
