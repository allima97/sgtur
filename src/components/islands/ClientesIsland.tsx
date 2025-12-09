import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";

type Cliente = {
  id: string;
  nome: string;
  nascimento: string | null;
  cpf: string;
  telefone: string;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  complemento: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  rg: string | null;
  genero: string | null;
  nacionalidade: string | null;
  tags: string[] | null;
  tipo_cliente: string | null;
  notas: string | null;
  active: boolean;
  created_at: string | null;
};

const initialForm = {
  nome: "",
  nascimento: "",
  cpf: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  complemento: "",
  cidade: "",
  estado: "",
  cep: "",
  rg: "",
  genero: "",
  nacionalidade: "",
  tags: "",
  tipo_cliente: "passageiro",
  notas: "",
  active: true,
};

export default function ClientesIsland() {
  // =====================================
  // PERMISSÕES
  // =====================================
  const { permissao, ativo, loading: loadPerm, isAdmin } = usePermissao("Clientes");

  const podeVer =
    permissao !== "none";
  const podeCriar =
    permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar =
    permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir =
    permissao === "delete" || permissao === "admin";

  // =====================================
  // STATES
  // =====================================
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [historicoCliente, setHistoricoCliente] = useState<Cliente | null>(null);
  const [historicoVendas, setHistoricoVendas] = useState<
    {
      id: string;
      data_lancamento: string;
      data_embarque: string | null;
      destino_nome: string;
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
      numero_venda: string | null;
      destino_nome: string | null;
    }[]
  >([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [detalheVenda, setDetalheVenda] = useState<{
    id: string;
    data_lancamento: string;
    data_embarque: string | null;
    destino_nome: string;
    valor_total: number;
    valor_taxas: number;
  } | null>(null);
  const [detalheRecibos, setDetalheRecibos] = useState<
    { numero_recibo: string | null; valor_total: number | null; valor_taxas: number | null; produto_nome: string | null }[]
  >([]);
  const [carregandoRecibos, setCarregandoRecibos] = useState(false);
  const [detalheOrcamento, setDetalheOrcamento] = useState<{
    id: string;
    data_orcamento: string | null;
    status: string | null;
    destino_nome: string | null;
    valor: number | null;
    numero_venda: string | null;
  } | null>(null);

  // =====================================
  // CARREGAR CLIENTES
  // =====================================
  async function carregar() {
    if (!podeVer) return;

    try {
      setLoading(true);
      setErro(null);

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;

      setClientes((data || []) as Cliente[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadPerm && podeVer) carregar();
  }, [loadPerm, podeVer]);

  // =====================================
  // FILTRO
  // =====================================
  const filtrados = useMemo(() => {
    if (!busca.trim()) return clientes;
    const t = busca.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(t) ||
        (c.cpf || "").includes(t) ||
        (c.email || "").toLowerCase().includes(t)
    );
  }, [clientes, busca]);

  // =====================================
  // FORM HANDLER
  // =====================================
  function handleChange(campo: string, valor: any) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function iniciarNovo() {
    if (!podeCriar) return;
    setEditId(null);
    setForm(initialForm);
  }

  async function abrirHistorico(cliente: Cliente) {
    setHistoricoCliente(cliente);
    setLoadingHistorico(true);
    try {
      const { data: viagens } = await supabase
        .from("historico_viagens_real")
        .select("id, data_viagem, valor_total, notas, destinos(nome)")
        .eq("cliente_id", cliente.id)
        .order("data_viagem", { ascending: false });

      const viagensFmt =
        viagens?.map((v: any) => ({
          id: v.id,
          data_viagem: v.data_viagem,
          destino_nome: v.destinos?.nome || "",
          valor_total: v.valor_total ?? null,
          notas: v.notas || null,
        })) || [];

      // Vendas e recibos
      const { data: vendasData } = await supabase
        .from("vendas")
        .select("id, data_lancamento, data_embarque, destino_id, destinos(nome)")
        .eq("cliente_id", cliente.id)
        .order("data_lancamento", { ascending: false });

      let vendasFmt:
        | {
            id: string;
            data_lancamento: string;
            data_embarque: string | null;
            destino_nome: string;
            valor_total: number;
            valor_taxas: number;
          }[]
        | [] = [];

      if (vendasData && vendasData.length > 0) {
        const vendaIds = vendasData.map((v: any) => v.id);
        const { data: recs } = await supabase
          .from("vendas_recibos")
          .select("venda_id, valor_total, valor_taxas")
          .in("venda_id", vendaIds);

        vendasFmt = vendasData.map((v: any) => {
          const recForVenda = (recs || []).filter((r: any) => r.venda_id === v.id);
          const total = recForVenda.reduce(
            (acc, r: any) => acc + (r.valor_total || 0),
            0
          );
          const taxas = recForVenda.reduce(
            (acc, r: any) => acc + (r.valor_taxas || 0),
            0
          );
          return {
            id: v.id,
            data_lancamento: v.data_lancamento,
            data_embarque: v.data_embarque,
            destino_nome: v.destinos?.nome || "",
            valor_total: total,
            valor_taxas: taxas,
          };
        });
      }

      const { data: orc } = await supabase
        .from("orcamentos")
        .select("id, data_orcamento, status, valor, numero_venda, destinos(nome)")
        .eq("cliente_id", cliente.id)
        .order("data_orcamento", { ascending: false });

      const orcFmt =
        orc?.map((o: any) => ({
          id: o.id,
          data_orcamento: o.data_orcamento,
          status: o.status,
          valor: o.valor ?? null,
          numero_venda: o.numero_venda ?? null,
          destino_nome: o.destinos?.nome || null,
        })) || [];

      setHistoricoVendas(vendasFmt);
      setHistoricoOrcamentos(orcFmt);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar histórico do cliente.");
    } finally {
      setLoadingHistorico(false);
    }
  }

  function fecharHistorico() {
    setHistoricoCliente(null);
    setHistoricoVendas([]);
    setHistoricoOrcamentos([]);
    setDetalheVenda(null);
    setDetalheRecibos([]);
    setDetalheOrcamento(null);
  }

  async function verDetalheVenda(v: {
    id: string;
    data_lancamento: string;
    data_embarque: string | null;
    destino_nome: string;
    valor_total: number;
    valor_taxas: number;
  }) {
    setDetalheVenda(v);
    setCarregandoRecibos(true);
    try {
      const { data } = await supabase
        .from("vendas_recibos")
        .select("numero_recibo, valor_total, valor_taxas, produtos(nome)")
        .eq("venda_id", v.id);
      setDetalheRecibos(
        (data || []).map((r: any) => ({
          numero_recibo: r.numero_recibo,
          valor_total: r.valor_total,
          valor_taxas: r.valor_taxas,
          produto_nome: r.produtos?.nome || null,
        }))
      );
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar recibos da venda.");
    } finally {
      setCarregandoRecibos(false);
    }
  }

  function verDetalheOrcamento(o: {
    id: string;
    data_orcamento: string | null;
    status: string | null;
    valor: number | null;
    numero_venda: string | null;
    destino_nome: string | null;
  }) {
    setDetalheOrcamento(o);
  }

  function iniciarEdicao(c: Cliente) {
    if (!podeEditar) return;

    setEditId(c.id);
    setForm({
      nome: c.nome,
      nascimento: c.nascimento || "",
      cpf: c.cpf,
      telefone: c.telefone,
      whatsapp: c.whatsapp || "",
      email: c.email || "",
      endereco: c.endereco || "",
      complemento: c.complemento || "",
      cidade: c.cidade || "",
      estado: c.estado || "",
      cep: c.cep || "",
      rg: c.rg || "",
      genero: c.genero || "",
      nacionalidade: c.nacionalidade || "",
      tags: (c.tags || []).join(", "),
      tipo_cliente: c.tipo_cliente || "passageiro",
      notas: c.notas || "",
      active: c.active,
    });
  }

  // =====================================
  // SALVAR CLIENTE
  // =====================================
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeCriar && !podeEditar) return;

    try {
      setSalvando(true);
      setErro(null);

      const payload = {
        nome: form.nome.trim(),
        nascimento: form.nascimento || null,
        cpf: form.cpf.trim(),
        telefone: form.telefone.trim(),
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        endereco: form.endereco.trim() || null,
        complemento: form.complemento.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        cep: form.cep.trim() || null,
        rg: form.rg.trim() || null,
        genero: form.genero.trim() || null,
        nacionalidade: form.nacionalidade.trim() || null,
        tags: form.tags
          ? form.tags.split(",").map((x) => x.trim())
          : [],
        tipo_cliente: form.tipo_cliente,
        notas: form.notas || null,
        active: form.active,
      };

      if (editId) {
        const { error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", editId);

        if (error) throw error;

        await registrarLog({
          acao: "cliente_editado",
          modulo: "Clientes",
          detalhes: { id: editId, payload },
        });
      } else {
        const { error } = await supabase
          .from("clientes")
          .insert(payload);

        if (error) throw error;

        await registrarLog({
          acao: "cliente_criado",
          modulo: "Clientes",
          detalhes: payload,
        });
      }

      setForm(initialForm);
      setEditId(null);
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar cliente.");
    } finally {
      setSalvando(false);
    }
  }

  // =====================================
  // EXCLUIR CLIENTE
  // =====================================
  async function excluir(id: string) {
    if (!podeExcluir) return;

    if (!window.confirm("Excluir cliente?")) return;

    try {
      setExcluindoId(id);

      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await registrarLog({
        acao: "cliente_excluido",
        modulo: "Clientes",
        detalhes: { id },
      });

      await carregar();
    } catch {
      setErro("Não foi possível excluir este cliente.");
    } finally {
      setExcluindoId(null);
    }
  }

  // =====================================
  // RESTRIÇÃO TOTAL DE MÓDULO
  // =====================================
  if (!ativo) {
    return (
      <div className="card-base card-config">
        <strong>Acesso negado ao módulo de Clientes.</strong>
      </div>
    );
  }

  // =====================================
  // PERMISSÃO APENAS PARA VER (não mostra form)
  // =====================================
  const modoSomenteLeitura = !podeCriar && !podeEditar;

  // =====================================
  // UI
  // =====================================
  return (
    <>
    <div className="clientes-page">

      {/* FORMULÁRIO */}
      {!modoSomenteLeitura && (
        <div className="card-base card-blue mb-3">
          <form onSubmit={salvar}>
            <h3>{editId ? "Editar cliente" : "Novo cliente"}</h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">CPF *</label>
                <input
                  className="form-input"
                  value={form.cpf}
                  onChange={(e) => handleChange("cpf", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telefone *</label>
                <input
                  className="form-input"
                  value={form.telefone}
                  onChange={(e) => handleChange("telefone", e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Whatsapp</label>
                <input
                  className="form-input"
                  value={form.whatsapp}
                  onChange={(e) => handleChange("whatsapp", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (,) </label>
                <input
                  className="form-input"
                  value={form.tags}
                  onChange={(e) => handleChange("tags", e.target.value)}
                  placeholder="premium, recorrente..."
                />
              </div>
            </div>

            <div className="mt-2" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={salvando}
                type="submit"
              >
                {salvando ? "Salvando..." : editId ? "Salvar alterações" : "Criar cliente"}
              </button>

              {editId && (
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={iniciarNovo}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* BUSCA */}
      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Buscar cliente</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, CPF ou e-mail"
            />
          </div>
        </div>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      {/* LISTA */}
      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[960px]">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Ativo</th>
              {(podeEditar || podeExcluir) && <th className="th-actions">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>Carregando...</td>
              </tr>
            )}

            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum cliente encontrado.</td>
              </tr>
            )}

            {!loading &&
              filtrados.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.cpf}</td>
                  <td>{c.telefone}</td>
                  <td>{c.email || "-"}</td>
                  <td>{c.active ? "Sim" : "Não"}</td>

                  {(podeEditar || podeExcluir) && (
                    <td className="th-actions">
                      <button
                        className="btn-icon"
                        onClick={() => abrirHistorico(c)}
                        title="Histórico"
                      >
                        🗂️
                      </button>
                      {podeEditar && (
                        <button
                          className="btn-icon"
                          onClick={() => iniciarEdicao(c)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                      )}

                      {podeExcluir && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => excluir(c.id)}
                          disabled={excluindoId === c.id}
                          title="Excluir"
                        >
                          {excluindoId === c.id ? "..." : "🗑️"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
    {historicoCliente && (
      <div className="modal-backdrop">
        <div className="modal-panel" style={{ maxWidth: 1100, width: "95vw" }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">Histórico de {historicoCliente.nome}</div>
              <small style={{ color: "#64748b" }}>Vendas e orçamentos do cliente</small>
            </div>
            <button className="btn-ghost" onClick={fecharHistorico}>✕</button>
          </div>

          <div className="modal-body">
            {loadingHistorico && <p>Carregando histórico...</p>}

            {!loadingHistorico && (
              <>
                <div className="card-base mb-2">
                  <h4 style={{ marginBottom: 8 }}>Vendas</h4>
                  <div className="table-container overflow-x-auto">
                    <table className="table-default table-header-blue min-w-[820px]">
                      <thead>
                        <tr>
                          <th>Data lançamento</th>
                          <th>Embarque</th>
                          <th>Destino</th>
                          <th>Valor</th>
                          <th>Taxas</th>
                          <th className="th-actions">Ações</th>
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
                            <td>
                              {v.data_lancamento
                                ? new Date(v.data_lancamento).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td>
                              {v.data_embarque
                                ? new Date(v.data_embarque).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td>{v.destino_nome || "-"}</td>
                            <td>
                              {v.valor_total.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td>
                              {v.valor_taxas.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td className="th-actions">
                              <button
                                className="btn-icon"
                                type="button"
                                onClick={() => verDetalheVenda(v)}
                                title="Ver detalhes"
                              >
                                👁️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card-base card-blue mb-2">
                  <h4 style={{ marginBottom: 8 }}>Orçamentos do cliente</h4>
                  <div className="table-container overflow-x-auto">
                    <table className="table-default table-header-blue min-w-[760px]">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Status</th>
                          <th>Destino</th>
                          <th>Valor</th>
                          <th>Venda</th>
                          <th className="th-actions">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoOrcamentos.length === 0 && (
                          <tr>
                            <td colSpan={5}>Nenhum orçamento encontrado.</td>
                          </tr>
                        )}
                        {historicoOrcamentos.map((o) => (
                          <tr key={o.id}>
                            <td>{o.data_orcamento?.slice(0, 10) || "-"}</td>
                            <td style={{ textTransform: "capitalize" }}>{o.status || "-"}</td>
                            <td>{o.destino_nome || "-"}</td>
                            <td>
                              {(o.valor ?? 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td>{o.numero_venda || "-"}</td>
                            <td className="th-actions">
                              <button
                                className="btn-icon"
                                type="button"
                                onClick={() => verDetalheOrcamento(o)}
                                title="Ver detalhes"
                              >
                                👁️
                              </button>
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

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={fecharHistorico}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Detalhe da venda */}
    {detalheVenda && (
      <div className="modal-backdrop">
        <div className="modal-panel" style={{ maxWidth: 720 }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">Detalhes da venda</div>
              <small style={{ color: "#64748b" }}>
                Destino: {detalheVenda.destino_nome || "-"}
              </small>
            </div>
            <button className="btn-ghost" onClick={() => { setDetalheVenda(null); setDetalheRecibos([]); }}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: 12, lineHeight: 1.5 }}>
              <div>
                <strong>Lançamento:</strong>{" "}
                {new Date(detalheVenda.data_lancamento).toLocaleDateString("pt-BR")}
              </div>
              <div>
                <strong>Embarque:</strong>{" "}
                {detalheVenda.data_embarque
                  ? new Date(detalheVenda.data_embarque).toLocaleDateString("pt-BR")
                  : "-"}
              </div>
              <div>
                <strong>Valor:</strong>{" "}
                {detalheVenda.valor_total.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              <div>
                <strong>Taxas:</strong>{" "}
                {detalheVenda.valor_taxas.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>

            <h4 style={{ marginBottom: 8 }}>Recibos</h4>
            {carregandoRecibos ? (
              <p>Carregando recibos...</p>
            ) : (
              <div className="table-container overflow-x-auto">
                <table className="table-default table-header-blue" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Produto</th>
                      <th>Valor</th>
                      <th>Taxas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalheRecibos.length === 0 && (
                      <tr>
                        <td colSpan={4}>Nenhum recibo encontrado.</td>
                      </tr>
                    )}
                    {detalheRecibos.map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.numero_recibo || "-"}</td>
                        <td>{r.produto_nome || "-"}</td>
                        <td>
                          {(r.valor_total || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td>
                          {(r.valor_taxas || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-outline"
              onClick={() => { setDetalheVenda(null); setDetalheRecibos([]); }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Detalhe do orçamento */}
    {detalheOrcamento && (
      <div className="modal-backdrop">
        <div className="modal-panel" style={{ maxWidth: 640 }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">Detalhes do orçamento</div>
              <small style={{ color: "#64748b" }}>
                Destino: {detalheOrcamento.destino_nome || "-"}
              </small>
            </div>
            <button className="btn-ghost" onClick={() => setDetalheOrcamento(null)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div style={{ lineHeight: 1.5 }}>
              <div>
                <strong>Data:</strong>{" "}
                {detalheOrcamento.data_orcamento
                  ? new Date(detalheOrcamento.data_orcamento).toLocaleDateString("pt-BR")
                  : "-"}
              </div>
              <div>
                <strong>Status:</strong> {detalheOrcamento.status || "-"}
              </div>
              <div>
                <strong>Valor:</strong>{" "}
                {(detalheOrcamento.valor || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              <div>
                <strong>Venda vinculada:</strong>{" "}
                {detalheOrcamento.numero_venda || "-"}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setDetalheOrcamento(null)}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
