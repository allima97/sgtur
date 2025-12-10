import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Cliente = { id: string; nome: string; cpf?: string | null };
type Destino = { id: string; nome: string };
type TipoProduto = { id: string; nome: string };

type FormVenda = {
  cliente_id: string;
  destino_id: string;
  data_lancamento: string;
  data_embarque: string;
};

type FormRecibo = {
  id?: string;
  produto_id: string;
  numero_recibo: string;
  valor_total: string;
  valor_taxas: string;
};

const initialVenda: FormVenda = {
  cliente_id: "",
  destino_id: "",
  data_lancamento: new Date().toISOString().substring(0, 10),
  data_embarque: "",
};

const initialRecibo: FormRecibo = {
  produto_id: "",
  numero_recibo: "",
  valor_total: "",
  valor_taxas: "0",
};

export default function VendasCadastroIsland() {
  // =======================================================
  // PERMISSÕES
  // =======================================================
  const { permissao, ativo, loading: loadPerm, isAdmin } = usePermissao("Vendas");
  const podeCriar =
    permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar =
    permissao === "edit" || permissao === "delete" || permissao === "admin";

  // =======================================================
  // ESTADOS
  // =======================================================
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [produtos, setProdutos] = useState<TipoProduto[]>([]);

  const [formVenda, setFormVenda] = useState<FormVenda>(initialVenda);
  const [recibos, setRecibos] = useState<FormRecibo[]>([]);

  const [editId, setEditId] = useState<string | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingVenda, setLoadingVenda] = useState(false);

  // AUTOCOMPLETE (cliente, destino, produto)
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaDestino, setBuscaDestino] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");

  // =======================================================
  // CARREGAR DADOS INICIAIS
  // =======================================================
  async function carregarDados(vendaId?: string) {
    try {
      setLoading(true);

      const [c, d, p] = await Promise.all([
        supabase.from("clientes").select("id, nome, cpf").order("nome"),
        supabase.from("produtos").select("id, nome").order("nome"),
        supabase.from("tipo_produtos").select("id, nome").order("nome"),
      ]);

      setClientes(c.data || []);
      setDestinos(d.data || []);
      setProdutos(p.data || []);

      if (vendaId) {
        await carregarVenda(vendaId);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarVenda(id: string) {
    try {
      setLoadingVenda(true);

      const { data: vendaData, error: vendaErr } = await supabase
        .from("vendas")
        .select("id, cliente_id, destino_id, data_lancamento, data_embarque")
        .eq("id", id)
        .maybeSingle();

      if (vendaErr) throw vendaErr;
      if (!vendaData) {
        setErro("Venda não encontrada para edição.");
        return;
      }

      setFormVenda({
        cliente_id: vendaData.cliente_id,
        destino_id: vendaData.destino_id,
        data_lancamento: vendaData.data_lancamento,
        data_embarque: vendaData.data_embarque || "",
      });

      const { data: recibosData, error: recErr } = await supabase
        .from("vendas_recibos")
        .select("*")
        .eq("venda_id", id);
      if (recErr) throw recErr;

      setRecibos(
        (recibosData || []).map((r: any) => ({
          id: r.id,
          produto_id: r.produto_id || "",
          numero_recibo: r.numero_recibo || "",
          valor_total: r.valor_total != null ? String(r.valor_total) : "",
          valor_taxas: r.valor_taxas != null ? String(r.valor_taxas) : "0",
        }))
      );
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar venda para edição.");
    } finally {
      setLoadingVenda(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setEditId(idParam);
  }, []);

  useEffect(() => {
    if (!loadPerm && ativo) carregarDados(editId || undefined);
  }, [loadPerm, ativo, editId]);

  // =======================================================
  // AUTOCOMPLETE
  // =======================================================
  const normalizarCpf = (v: string) => v.replace(/\D/g, "");

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes;
    const t = normalizeText(buscaCliente);
    return clientes.filter((c) => {
      const cpf = normalizarCpf(c.cpf || "");
      return (
        normalizeText(c.nome).includes(t) ||
        cpf.includes(normalizarCpf(t))
      );
    });
  }, [clientes, buscaCliente]);

  const destinosFiltrados = useMemo(() => {
    if (!buscaDestino.trim()) return destinos;
    const t = normalizeText(buscaDestino);
    return destinos.filter((c) => normalizeText(c.nome).includes(t));
  }, [destinos, buscaDestino]);

  const produtosFiltrados = useMemo(() => {
    if (!buscaProduto.trim()) return produtos;
    const t = normalizeText(buscaProduto);
    return produtos.filter((c) => normalizeText(c.nome).includes(t));
  }, [produtos, buscaProduto]);

  // =======================================================
  // HANDLERS
  // =======================================================
  function addRecibo() {
    setRecibos((prev) => [...prev, { ...initialRecibo }]);
  }

  function updateRecibo(index: number, campo: string, valor: string) {
    setRecibos((prev) => {
      const novo = [...prev];
      (novo[index] as any)[campo] = valor;
      return novo;
    });
  }

  function removerRecibo(index: number) {
    setRecibos((prev) => prev.filter((_, i) => i !== index));
  }

  // =======================================================
  // SALVAR VENDA COMPLETA (VENDA + RECIBOS)
  // =======================================================
  async function salvarVenda(e: React.FormEvent) {
    e.preventDefault();

    if (!podeCriar && !isAdmin) {
      setErro("Você não possui permissão para cadastrar vendas.");
      return;
    }

    if (recibos.length === 0) {
      setErro("Uma venda precisa ter ao menos 1 recibo.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        setSalvando(false);
        return;
      }

      let vendaId = editId;

      if (editId) {
        // Atualiza venda existente
        const { error: vendaErr } = await supabase
          .from("vendas")
          .update({
            cliente_id: formVenda.cliente_id,
            destino_id: formVenda.destino_id,
            data_lancamento: formVenda.data_lancamento,
            data_embarque: formVenda.data_embarque || null,
          })
          .eq("id", editId);
        if (vendaErr) throw vendaErr;

        // substitui recibos para manter consistência
        await supabase.from("vendas_recibos").delete().eq("venda_id", editId);

        for (const r of recibos) {
          const { error } = await supabase.from("vendas_recibos").insert({
            venda_id: editId,
            produto_id: r.produto_id || null,
            numero_recibo: r.numero_recibo.trim(),
            valor_total: Number(r.valor_total),
            valor_taxas: Number(r.valor_taxas),
          });
          if (error) throw error;
        }

        await registrarLog({
          acao: "venda_atualizada",
          modulo: "Vendas",
          detalhes: { id: editId, venda: formVenda, recibos },
        });

        alert("Venda atualizada com sucesso!");
        await carregarVenda(editId);
      } else {
        // 1) INSERE VENDA
        const { data: vendaData, error: vendaErr } = await supabase
          .from("vendas")
          .insert({
            vendedor_id: userId,
            cliente_id: formVenda.cliente_id,
            destino_id: formVenda.destino_id,
            data_lancamento: formVenda.data_lancamento,
            data_embarque: formVenda.data_embarque || null,
          })
          .select()
          .single();

        if (vendaErr) throw vendaErr;

        vendaId = vendaData.id;

        // 2) INSERE RECIBOS
        for (const r of recibos) {
          const { error } = await supabase.from("vendas_recibos").insert({
            venda_id: vendaId,
            produto_id: r.produto_id || null,
            numero_recibo: r.numero_recibo.trim(),
            valor_total: Number(r.valor_total),
            valor_taxas: Number(r.valor_taxas),
          });

          if (error) throw error;
        }

        // 3) AUDITORIA
        await registrarLog({
          acao: "venda_criada",
          modulo: "Vendas",
          detalhes: {
            venda: formVenda,
            recibos,
            id: vendaId,
          },
        });

        alert("Venda cadastrada com sucesso!");
        setFormVenda(initialVenda);
        setRecibos([]);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar venda.");
    } finally {
      setSalvando(false);
    }
  }

  // =======================================================
  // BLOQUEIO TOTAL
  // =======================================================
  if (!ativo) {
    return (
      <div className="card-base card-config">
        <strong>Acesso negado ao módulo de Vendas.</strong>
      </div>
    );
  }

  if (!podeCriar && !isAdmin) {
    return (
      <div className="card-base card-config">
        <strong>Você não possui permissão para cadastrar vendas.</strong>
      </div>
    );
  }

  // =======================================================
  // FORM
  // =======================================================
  return (
    <div className="vendas-cadastro-page">

      {/* FORM VENDA */}
      <div className="card-base card-green mb-3">
        <h3>{editId ? "Editar venda" : "Cadastro de Venda"}</h3>
        {editId && (
          <small style={{ color: "#0f172a" }}>
            Modo edição — altere cliente, destino, embarque e recibos.
          </small>
        )}

        {erro && (
          <div className="card-base card-config mb-3">
            <strong>{erro}</strong>
          </div>
        )}

        <form onSubmit={salvarVenda}>
          <div className="form-row">
            {/* CLIENTE */}
            <div className="form-group">
              <label className="form-label">Cliente *</label>
              <input
                className="form-input"
                list="listaClientes"
                placeholder="Buscar cliente..."
                value={
                  clientes.find((c) => c.id === formVenda.cliente_id)?.nome ||
                  buscaCliente
                }
                onChange={(e) => setBuscaCliente(e.target.value)}
                onBlur={() => {
                  const texto = buscaCliente.toLowerCase();
                  const cpfTexto = normalizarCpf(buscaCliente);
                  const achado = clientesFiltrados.find((c) => {
                    const cpf = normalizarCpf(c.cpf || "");
                    return (
                      c.nome.toLowerCase() === texto ||
                      (cpfTexto && cpf === cpfTexto)
                    );
                  });
                  if (achado) {
                    setFormVenda({
                      ...formVenda,
                      cliente_id: achado.id,
                    });
                  }
                }}
                required
              />
              <datalist id="listaClientes">
                {clientesFiltrados.map((c) => (
                  <option
                    key={c.id}
                    value={c.nome}
                    label={c.cpf ? `CPF: ${c.cpf}` : undefined}
                  />
                ))}
              </datalist>
            </div>

            {/* DESTINO */}
            <div className="form-group">
              <label className="form-label">Destino *</label>
              <input
                className="form-input"
                list="listaDestinos"
                placeholder="Buscar destino..."
                value={
                  destinos.find((d) => d.id === formVenda.destino_id)?.nome ||
                  buscaDestino
                }
                onChange={(e) => setBuscaDestino(e.target.value)}
                onBlur={() => {
                  const achado = destinosFiltrados.find(
                    (d) => d.nome.toLowerCase() === buscaDestino.toLowerCase()
                  );
                  if (achado) {
                    setFormVenda({
                      ...formVenda,
                      destino_id: achado.id,
                    });
                  }
                }}
                required
              />
              <datalist id="listaDestinos">
                {destinosFiltrados.map((d) => (
                  <option key={d.id} value={d.nome} />
                ))}
              </datalist>
            </div>

            {/* EMBARQUE */}
            <div className="form-group">
              <label className="form-label">Data de embarque</label>
              <input
                className="form-input"
                type="date"
                value={formVenda.data_embarque}
                onChange={(e) =>
                  setFormVenda({
                    ...formVenda,
                    data_embarque: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* RECIBOS */}
          <h4 className="mt-3">Recibos da Venda</h4>

          {recibos.map((r, i) => (
            <div key={i} className="card-base mb-2">
              <div className="form-row">
                {/* PRODUTO */}
                <div className="form-group">
                  <label className="form-label">Produto *</label>
                  <input
                    className="form-input"
                    list="listaProdutos"
                    placeholder="Buscar produto..."
                    value={
                      produtos.find((p) => p.id === r.produto_id)?.nome ||
                      buscaProduto
                    }
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    onBlur={() => {
                      const achado = produtosFiltrados.find(
                        (p) =>
                          p.nome.toLowerCase() === buscaProduto.toLowerCase()
                      );
                      if (achado) {
                        updateRecibo(i, "produto_id", achado.id);
                      }
                    }}
                    required
                  />
                  <datalist id="listaProdutos">
                    {produtosFiltrados.map((p) => (
                      <option key={p.id} value={p.nome} />
                    ))}
                  </datalist>
                </div>

                {/* NÚMERO */}
                <div className="form-group">
                  <label className="form-label">Número recibo *</label>
                  <input
                    className="form-input"
                    value={r.numero_recibo}
                    onChange={(e) =>
                      updateRecibo(i, "numero_recibo", e.target.value)
                    }
                    required
                  />
                </div>

                {/* VALOR */}
                <div className="form-group">
                  <label className="form-label">Valor total *</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={r.valor_total}
                    onChange={(e) =>
                      updateRecibo(i, "valor_total", e.target.value)
                    }
                    required
                  />
                </div>

                {/* TAXAS */}
                <div className="form-group">
                  <label className="form-label">Taxas</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={r.valor_taxas}
                    onChange={(e) =>
                      updateRecibo(i, "valor_taxas", e.target.value)
                    }
                  />
                </div>

                {/* REMOVER */}
                <div className="form-group" style={{ width: "80px" }}>
                  <button
                    type="button"
                    className="btn-icon btn-danger mt-4"
                    onClick={() => removerRecibo(i)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-3" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={addRecibo}
            >
              ➕ Adicionar recibo
            </button>

            <button
              type="submit"
              className="btn btn-success"
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Salvar venda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
