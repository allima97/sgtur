import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Venda = {
  id: string;
  vendedor_id?: string | null;
  cliente_id: string;
  destino_id: string;
  destino_cidade_id?: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  cliente_nome?: string;
  destino_nome?: string;
  destino_cidade_nome?: string;
};

type Recibo = {
  id: string;
  venda_id: string;
  produto_id: string | null;
  numero_recibo: string | null;
  valor_total: number | null;
  valor_taxas: number | null;
  produto_nome?: string | null;
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

type Papel = "ADMIN" | "GESTOR" | "VENDEDOR" | "OUTRO";

type UserCtx = {
  usuarioId: string;
  papel: Papel;
  vendedorIds: string[];
};

export default function VendasConsultaIsland() {
  // ================================
  // PERMISSÕES
  // ================================
  const { permissao, ativo, loading: loadPerm, isAdmin } = usePermissao("Vendas");

  const podeVer = permissao !== "none";
  const podeCriar =
    permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar =
    permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir =
    permissao === "delete" || permissao === "admin";

  // ================================
  // ESTADOS
  // ================================
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  // modal
  const [modalVenda, setModalVenda] = useState<Venda | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [excluindoRecibo, setExcluindoRecibo] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  // ================================
  // CONTEXTO DE USUÁRIO (papel/vendedorIds)
  // ================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setPendingOpenId(idParam);
  }, []);

  useEffect(() => {
    async function carregarUserCtx() {
      try {
        setErro(null);
        setLoadingUser(true);

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          setErro("Usuário não autenticado.");
          return;
        }

        const { data: usuarioDb } = await supabase
          .from("users")
          .select("id, user_types(name)")
          .eq("id", userId)
          .maybeSingle();

        const tipoName =
          ((usuarioDb as any)?.user_types as any)?.name ||
          (auth?.user?.user_metadata as any)?.name ||
          "";
        const tipoNorm = String(tipoName || "").toUpperCase();

        let papel: Papel = "VENDEDOR";
        if (tipoNorm.includes("ADMIN")) papel = "ADMIN";
        else if (tipoNorm.includes("GESTOR")) papel = "GESTOR";
        else if (tipoNorm.includes("VENDEDOR")) papel = "VENDEDOR";
        else papel = "OUTRO";

        let vendedorIds: string[] = [userId];

        if (papel === "GESTOR") {
          const { data: rel } = await supabase
            .from("gestor_vendedor")
            .select("vendedor_id")
            .eq("gestor_id", userId);
          const extras =
            rel
              ?.map((r: any) => r.vendedor_id)
              .filter((id: string | null): id is string => Boolean(id)) || [];
          vendedorIds = Array.from(new Set([userId, ...extras]));
        } else if (papel === "ADMIN") {
          vendedorIds = []; // sem filtro
        }

        setUserCtx({ usuarioId: userId, papel, vendedorIds });
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar contexto do usuário.");
      } finally {
        setLoadingUser(false);
      }
    }

    carregarUserCtx();
  }, []);

  // ================================
  // CARREGAR LISTA
  // ================================
  async function carregar() {
    if (!podeVer || !userCtx) return;

    try {
      setLoading(true);

      let query = supabase
        .from("vendas")
        .select(`
          id,
          vendedor_id,
          cliente_id,
          destino_id,
          data_lancamento,
          data_embarque,
          clientes(nome),
          destinos:produtos!destino_id (
            nome,
            cidade_id
          )
        `)
        .order("data_lancamento", { ascending: false });

      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }

      const { data: vendasData, error } = await query;
      if (error) throw error;

      const cidadeIds = Array.from(
        new Set(
          (vendasData || [])
            .map((row: any) => row.destinos?.cidade_id)
            .filter((id: string | null | undefined): id is string => Boolean(id))
        )
      );

      let cidadesMap: Record<string, string> = {};
      if (cidadeIds.length > 0) {
        const { data: cidadesData, error: cidadesError } = await supabase
          .from("cidades")
          .select("id, nome")
          .in("id", cidadeIds);
        if (cidadesError) {
          console.error(cidadesError);
        } else {
          cidadesMap = Object.fromEntries(
            (cidadesData || []).map((c: any) => [c.id, c.nome])
          );
        }
      }

      const v = (vendasData || []).map((row: any) => {
        const cidadeId = row.destinos?.cidade_id || "";
        return {
          id: row.id,
          vendedor_id: row.vendedor_id,
          cliente_id: row.cliente_id,
          destino_id: row.destino_id,
          destino_cidade_id: cidadeId,
          data_lancamento: row.data_lancamento,
          data_embarque: row.data_embarque,
          cliente_nome: row.clientes?.nome || "",
          destino_nome: row.destinos?.nome || "",
          destino_cidade_nome: cidadeId ? cidadesMap[cidadeId] || "" : "",
        };
      });

      setVendas(v);

      const vendaIds = v.map((i) => i.id);
      if (vendaIds.length === 0) {
        setRecibos([]);
      } else {
        const { data: recibosData } = await supabase
          .from("vendas_recibos")
          .select("*")
          .in("venda_id", vendaIds);

        const produtoIds = Array.from(
          new Set(
            (recibosData || [])
              .map((r: any) => r.produto_id)
              .filter((id: string | null | undefined): id is string => Boolean(id))
          )
        );

        const vendaCidadeMap = v.reduce<Record<string, string>>((acc, vendaItem) => {
          if (vendaItem.destino_cidade_id) acc[vendaItem.id] = vendaItem.destino_cidade_id;
          return acc;
        }, {});

        let produtosLista: any[] = [];
        let tipoProdMap: Record<string, { nome: string; disponivel_todas_cidades?: boolean | null }> = {};

        if (produtoIds.length > 0) {
          const { data: produtosData, error: prodErr } = await supabase
            .from("produtos")
            .select("id, nome, cidade_id, tipo_produto, tipo_produtos(disponivel_todas_cidades)")
            .in("tipo_produto", produtoIds);
          if (!prodErr && produtosData) produtosLista = produtosData as any[];
          else if (prodErr) console.error(prodErr);

          const { data: tiposData, error: tipoErr } = await supabase
            .from("tipo_produtos")
            .select("id, nome, disponivel_todas_cidades")
            .in("id", produtoIds);
          if (!tipoErr && tiposData) {
            tipoProdMap = Object.fromEntries(
              (tiposData as any[]).map((t) => [t.id, { nome: t.nome || "Produto", disponivel_todas_cidades: t.disponivel_todas_cidades }])
            );
          } else if (tipoErr) {
            console.error(tipoErr);
          }
        }

        const recibosEnriquecidos =
          (recibosData || []).map((r: any) => {
            const cidadeVenda = vendaCidadeMap[r.venda_id] || "";
            const candidato = produtosLista.find((p) => {
              const ehGlobal = !!p?.tipo_produtos?.disponivel_todas_cidades;
              return p.tipo_produto === r.produto_id && (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda);
            });
            const tipoInfo = tipoProdMap[r.produto_id as string] || {};
            return {
              ...r,
              produto_nome: candidato?.nome || tipoInfo.nome || "",
            };
          }) || [];

        setRecibos(recibosEnriquecidos);
      }

      if (pendingOpenId) {
        const alvo = v.find((i) => i.id === pendingOpenId);
        if (alvo) setModalVenda(alvo);
        setPendingOpenId(null);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar vendas.");
      showToast("Erro ao carregar vendas.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadPerm && podeVer && userCtx) carregar();
  }, [loadPerm, podeVer, userCtx]);

  const filtroLabel = useMemo(() => {
    if (!userCtx) return "";
    if (userCtx.papel === "ADMIN") return "Todas as vendas";
    if (userCtx.papel === "GESTOR") return "Vendas da sua equipe";
    return "Suas vendas";
  }, [userCtx]);

  // ================================
  // FILTRO
  // ================================
  const vendasFiltradas = useMemo(() => {
    if (!busca.trim()) return vendas;

    const t = normalizeText(busca);

    return vendas.filter(
      (v) =>
        normalizeText(v.cliente_nome || "").includes(t) ||
        normalizeText(v.destino_nome || "").includes(t) ||
        normalizeText(v.id).includes(t)
    );
  }, [vendas, busca]);

  // ================================
  // RECIBOS POR VENDA
  // ================================
  function recibosDaVenda(id: string) {
    return recibos.filter((r) => r.venda_id === id);
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setToastCounter((prev) => prev + 1);
    const id = toastCounter + 1;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  // ================================
  // CANCELAR VENDA
  // ================================
  async function cancelarVenda(venda: Venda) {
    if (!podeExcluir && !isAdmin) return;
    if (!confirm("Tem certeza que deseja CANCELAR esta venda?")) return;

    try {
      setCancelando(true);

      // EXCLUI TODOS OS RECIBOS → a venda deixa de existir
      await supabase.from("vendas_recibos").delete().eq("venda_id", venda.id);

      // deleta a venda
      await supabase.from("vendas").delete().eq("id", venda.id);

      // LOG
      await registrarLog({
        acao: "venda_cancelada",
        modulo: "Vendas",
        detalhes: { id: venda.id },
      });

      await carregar();
      setModalVenda(null);
      showToast("Venda cancelada.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao cancelar venda.");
      showToast("Erro ao cancelar venda.", "error");
    } finally {
      setCancelando(false);
    }
  }

  // ================================
  // EXCLUIR RECIBO
  // ================================
  async function excluirRecibo(id: string, vendaId: string) {
    if (!podeExcluir) return;
    if (!confirm("Excluir este recibo?")) return;

    try {
      setExcluindoRecibo(id);

      await supabase.from("vendas_recibos").delete().eq("id", id);

      await registrarLog({
        acao: "recibo_excluido",
        modulo: "Vendas",
        detalhes: { recibo_id: id, venda_id: vendaId },
      });

      await carregar();
      showToast("Recibo excluído.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir recibo.");
      showToast("Erro ao excluir recibo.", "error");
    } finally {
      setExcluindoRecibo(null);
    }
  }

  // ================================
  // REMARCAR (editar) VENDA
  // ================================
  async function remarcarData(venda: Venda, novaData: string) {
    if (!podeEditar) return;

    try {
      setSalvando(true);

      await supabase
        .from("vendas")
        .update({ data_embarque: novaData })
        .eq("id", venda.id);

      await registrarLog({
        acao: "venda_remarcada",
        modulo: "Vendas",
        detalhes: { venda_id: venda.id, nova_data: novaData },
      });

      await carregar();
      showToast("Data de embarque atualizada.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao remarcar venda.");
      showToast("Erro ao remarcar.", "error");
    } finally {
      setSalvando(false);
    }
  }

  // ================================
  // BLOQUEIO TOTAL DE MÓDULO
  // ================================
  if (loadingUser || loadPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return (
      <div className="card-base card-config">
        <strong>Acesso negado ao módulo de Vendas.</strong>
      </div>
    );
  }

  if (!podeVer) {
    return (
      <div className="card-base card-config">
        <strong>Você não possui permissão para visualizar Vendas.</strong>
      </div>
    );
  }

  // ================================
  // UI — LISTAGEM
  // ================================
  return (
    <div className="vendas-consulta-page">

      {/* BUSCA */}
      <div className="card-base mb-3">
        <div className="form-row" style={{ marginTop: 8, gridTemplateColumns: "1fr auto" }}>
          <div className="form-group">
            <label className="form-label">Buscar venda</label>
            <input
              className="form-input"
              placeholder="Nome, destino ou ID..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {filtroLabel && (
              <small style={{ color: "#64748b" }}>
                {filtroLabel} {userCtx?.papel !== "ADMIN" ? "(restrição por vendedor)" : ""}
              </small>
            )}
          </div>
          {podeCriar && (
            <div className="form-group" style={{ alignItems: "flex-start" }}>
              <span style={{ visibility: "hidden" }}>botão</span>
              <a className="btn btn-primary" href="/vendas/cadastro">
                Nova venda
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      {/* TABELA */}
      <div className="table-container overflow-x-auto" style={{ maxHeight: "65vh", overflowY: "auto" }}>
        <table className="table-default table-header-green min-w-[820px]">
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>Cliente</th>
              <th>Destino</th>
              <th>Produto</th>
              <th style={{ textAlign: "center" }}>Embarque</th>
              <th>Valor</th>
              <th>Taxas</th>
              {podeVer && <th className="th-actions" style={{ textAlign: "center" }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>Carregando...</td>
              </tr>
            )}

            {!loading && vendasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhuma venda encontrada.</td>
              </tr>
            )}

            {!loading &&
              vendasFiltradas.map((v) => {
                const totalValor = recibosDaVenda(v.id).reduce((acc, r) => acc + (r.valor_total || 0), 0);
                const totalTaxas = recibosDaVenda(v.id).reduce((acc, r) => acc + (r.valor_taxas || 0), 0);
                const produtosVenda = recibosDaVenda(v.id)
                  .map((r) => r.produto_nome || "")
                  .filter(Boolean);

                return (
                  <tr key={v.id}>
                    <td>{v.cliente_nome}</td>
                    <td>{v.destino_cidade_nome || "-"}</td>
                    <td>
                      {produtosVenda.length === 0 ? (
                        "-"
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {produtosVenda.map((p, idx) => (
                            <span key={`${v.id}-prod-${idx}`}>{p}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {v.data_embarque
                        ? new Date(v.data_embarque).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td>
                      R${" "}
                      {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      {totalTaxas === 0
                        ? "-"
                        : `R$ ${totalTaxas.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`}
                    </td>
                    <td className="th-actions" style={{ textAlign: "center" }}>
                      <button
                        className="btn-icon"
                        title="Ver detalhes"
                        onClick={() => setModalVenda(v)}
                      >
                        👁️
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ================================
          MODAL DETALHES
      ================================= */}
      {modalVenda && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: "820px" }}>
            <div className="modal-header">
              <div>
                <div
                  className="modal-title"
                  style={{ color: "#16a34a", fontSize: "1.15rem", fontWeight: 800 }}
                >
                  Detalhes da venda
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setModalVenda(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div
                className="mb-3"
                style={{ display: "grid", gap: 6, lineHeight: 1.4 }}
              >
                <div>
                  <strong>Cliente:</strong> {modalVenda.cliente_nome || "-"}
                </div>
                <div>
                  <strong>Cidade:</strong> {modalVenda.destino_cidade_nome || "Não informada"}
                </div>
                <div>
                  <strong>Lançada em:</strong>{" "}
                  {new Date(modalVenda.data_lancamento).toLocaleDateString("pt-BR")}
                </div>
                <div>
                  <strong>Embarque:</strong>{" "}
                  {modalVenda.data_embarque
                    ? new Date(modalVenda.data_embarque).toLocaleDateString("pt-BR")
                    : "-"}
                </div>
              </div>

              {/* RECIBOS */}
              <h4 style={{ marginBottom: 8, textAlign: "center" }}>Recibos</h4>
              <div className="table-container overflow-x-auto">
                <table
                  className="table-default table-header-green"
                  style={{ minWidth: 520 }}
                >
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Produto</th>
                      <th>Valor</th>
                      <th>Taxas</th>
                      {podeExcluir && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {recibosDaVenda(modalVenda.id).map((r) => {
                      const valorFmt = (r.valor_total || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                      const taxasNum = r.valor_taxas || 0;
                      const taxasFmt =
                        taxasNum === 0
                          ? "-"
                          : `R$ ${taxasNum.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`;

                      return (
                        <tr key={r.id}>
                          <td>{r.numero_recibo || "-"}</td>
                          <td>{r.produto_nome || "-"}</td>
                          <td>R$ {valorFmt}</td>
                          <td>{taxasFmt}</td>
                          {podeExcluir && (
                            <td>
                              <button
                                className="btn-icon btn-danger"
                                disabled={excluindoRecibo === r.id}
                                onClick={() => excluirRecibo(r.id, modalVenda.id)}
                              >
                                {excluindoRecibo === r.id ? "…" : "🗑️"}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {(podeEditar || podeExcluir) && (
              <div className="modal-footer">
                {podeEditar && (
                    <>
                      <button
                        className="btn btn-outline"
                        style={{ minWidth: 130, backgroundColor: "#f3f4f6", color: "#1f2937" }}
                        onClick={() => {
                          const url = `/vendas/cadastro?id=${modalVenda.id}${
                            modalVenda.destino_cidade_id ? `&cidadeId=${modalVenda.destino_cidade_id}` : ""
                          }${
                            modalVenda.destino_cidade_nome
                              ? `&cidadeNome=${encodeURIComponent(modalVenda.destino_cidade_nome)}`
                              : ""
                          }`;
                          window.location.href = url;
                        }}
                      >
                        Editar
                      </button>
                    <button
                      className="btn btn-primary"
                      style={{ minWidth: 130 }}
                      onClick={() => {
                        const nova = prompt(
                          "Nova data de embarque (AAAA-MM-DD):",
                          modalVenda.data_embarque || ""
                        );
                        if (nova) remarcarData(modalVenda, nova);
                      }}
                      disabled={salvando}
                    >
                      {salvando ? "Salvando..." : "Remarcar"}
                    </button>
                  </>
                )}

                {podeExcluir && (
                  <button
                    className="btn btn-danger"
                    style={{ minWidth: 130 }}
                    onClick={() => cancelarVenda(modalVenda)}
                    disabled={cancelando}
                  >
                    {cancelando ? "Cancelando..." : "Cancelar Venda"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            display: "grid",
            gap: 8,
            zIndex: 9999,
            maxWidth: "320px",
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="card-base"
              style={{
                padding: "10px 12px",
                background: t.type === "success" ? "#ecfdf3" : "#fee2e2",
                border: `1px solid ${t.type === "success" ? "#16a34a" : "#ef4444"}`,
                color: "#0f172a",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
