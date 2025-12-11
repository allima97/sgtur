import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Cliente = { id: string; nome: string; cpf?: string | null };
type Cidade = { id: string; nome: string };
type CidadeSugestao = { id: string; nome: string; subdivisao_nome?: string | null; pais_nome?: string | null };
type Produto = { id: string; nome: string; cidade_id: string | null; tipo_produto: string | null };

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
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [formVenda, setFormVenda] = useState<FormVenda>(initialVenda);
  const [recibos, setRecibos] = useState<FormRecibo[]>([]);

  const [editId, setEditId] = useState<string | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingVenda, setLoadingVenda] = useState(false);

  // AUTOCOMPLETE (cliente, cidade de destino, produto)
const [buscaCliente, setBuscaCliente] = useState("");
const [buscaDestino, setBuscaDestino] = useState("");
const [buscaProduto, setBuscaProduto] = useState("");
const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = useState(false);
const [resultadosCidade, setResultadosCidade] = useState<CidadeSugestao[]>([]);
const [buscandoCidade, setBuscandoCidade] = useState(false);
const [erroCidade, setErroCidade] = useState<string | null>(null);
const [buscaCidadeSelecionada, setBuscaCidadeSelecionada] = useState("");

  // =======================================================
  // CARREGAR DADOS INICIAIS
  // =======================================================
  async function carregarDados(vendaId?: string) {
    try {
      setLoading(true);

      const [c, d, p] = await Promise.all([
        supabase.from("clientes").select("id, nome, cpf").order("nome"),
        supabase.from("cidades").select("id, nome").order("nome"),
        supabase.from("produtos").select("id, nome, cidade_id, tipo_produto").order("nome"),
      ]);

      setClientes(c.data || []);
      const cidadesLista = (d.data || []) as Cidade[];
      setCidades(cidadesLista);
      setProdutos(p.data || []);

      if (vendaId) {
        await carregarVenda(vendaId, cidadesLista);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarVenda(id: string, cidadesBase?: Cidade[]) {
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

      // destino_id na tabela aponta para produto; buscamos cidade desse produto
      let cidadeId = "";
      let cidadeNome = "";
      if (vendaData.destino_id) {
        const { data: prodData } = await supabase
          .from("produtos")
          .select("id, cidade_id")
          .eq("id", vendaData.destino_id)
          .maybeSingle();
        cidadeId = prodData?.cidade_id || "";
        const lista = cidadesBase || cidades;
        const cidadeSelecionada = lista.find((c) => c.id === cidadeId);
        if (cidadeSelecionada) cidadeNome = cidadeSelecionada.nome;
      }

      setFormVenda({
        cliente_id: vendaData.cliente_id,
        destino_id: cidadeId,
        data_lancamento: vendaData.data_lancamento,
        data_embarque: vendaData.data_embarque || "",
      });
      setBuscaDestino(cidadeNome);
      setBuscaCidadeSelecionada(cidadeNome);

      const { data: recibosData, error: recErr } = await supabase
        .from("vendas_recibos")
        .select("*")
        .eq("venda_id", id);
      if (recErr) throw recErr;

      setRecibos(
        (recibosData || []).map((r: any) => ({
          id: r.id,
          produto_id:
            produtos.find((p) => p.tipo_produto === r.produto_id && (!cidadeId || p.cidade_id === cidadeId))?.id || "",
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

  // Busca cidade (autocomplete)
  useEffect(() => {
    if (buscaDestino.trim().length < 2) {
      setResultadosCidade([]);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setBuscandoCidade(true);
      setErroCidade(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: buscaDestino.trim(), limite: 10 },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          if (error) {
            console.error("Erro ao buscar cidades:", error);
            setErroCidade("Erro ao buscar cidades (RPC). Tentando fallback...");
            const { data: dataFallback, error: errorFallback } = await supabase
              .from("cidades")
              .select("id, nome")
              .ilike("nome", `%${buscaDestino.trim()}%`)
              .order("nome");
            if (errorFallback) {
              console.error("Erro no fallback de cidades:", errorFallback);
              setErroCidade("Erro ao buscar cidades.");
            } else {
              setResultadosCidade((dataFallback as CidadeSugestao[]) || []);
              setErroCidade(null);
            }
          } else {
            setResultadosCidade((data as CidadeSugestao[]) || []);
          }
        }
      } finally {
        if (!controller.signal.aborted) setBuscandoCidade(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [buscaDestino]);

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

  const cidadesFiltradas = useMemo(() => {
    if (!buscaDestino.trim()) return cidades;
    const t = normalizeText(buscaDestino);
    return cidades.filter((c) => normalizeText(c.nome).includes(t));
  }, [cidades, buscaDestino]);

  const produtosFiltrados = useMemo(() => {
    const base = formVenda.destino_id
      ? produtos.filter((p) => p.cidade_id === formVenda.destino_id)
      : [];
    if (!buscaProduto.trim()) return base;
    const t = normalizeText(buscaProduto);
    return base.filter((c) => normalizeText(c.nome).includes(t));
  }, [produtos, buscaProduto, formVenda.destino_id]);

  function handleCidadeDestino(valor: string) {
    setBuscaDestino(valor);
    const cidadeAtual = cidades.find((c) => c.id === formVenda.destino_id);
    if (!cidadeAtual || !normalizeText(cidadeAtual.nome).includes(normalizeText(valor))) {
      setFormVenda((prev) => ({ ...prev, destino_id: "" }));
    }
    setMostrarSugestoesCidade(true);
  }

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

  useEffect(() => {
    // Ao trocar a cidade, limpa buscas e produtos que não pertencem a ela
    setBuscaProduto("");
    setRecibos((prev) =>
      prev.map((r) => {
        const prod = produtos.find((p) => p.id === r.produto_id);
        if (prod && prod.cidade_id === formVenda.destino_id) return r;
        return { ...r, produto_id: "" };
      })
    );
  }, [formVenda.destino_id, produtos]);

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

      if (!recibos.length) {
        setErro("Uma venda precisa ter ao menos 1 recibo.");
        setSalvando(false);
        return;
      }

      const produtoDestinoId = recibos[0]?.produto_id;
      if (!produtoDestinoId) {
        setErro("Selecione um produto para o recibo. O primeiro recibo define o destino da venda.");
        setSalvando(false);
        return;
      }

      const produtoDestino = produtos.find((p) => p.id === produtoDestinoId);
      if (!produtoDestino || produtoDestino.cidade_id !== formVenda.destino_id) {
        setErro("O produto do recibo precisa pertencer à cidade de destino selecionada.");
        setSalvando(false);
        return;
      }
      if (!produtoDestino.tipo_produto) {
        setErro("O produto selecionado não possui tipo vinculado. Cadastre um tipo de produto para ele.");
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
            destino_id: produtoDestinoId, // FK para produtos
            data_lancamento: formVenda.data_lancamento,
            data_embarque: formVenda.data_embarque || null,
          })
          .eq("id", editId);
        if (vendaErr) throw vendaErr;

        // substitui recibos para manter consistência
        await supabase.from("vendas_recibos").delete().eq("venda_id", editId);

        for (const r of recibos) {
          const prod = produtos.find((p) => p.id === r.produto_id);
          if (!prod?.tipo_produto) {
            throw new Error("Produto do recibo não possui tipo vinculado.");
          }
          const { error } = await supabase.from("vendas_recibos").insert({
            venda_id: editId,
            produto_id: prod.tipo_produto, // FK espera tipo_produtos
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
            destino_id: produtoDestinoId, // FK para produtos
            data_lancamento: formVenda.data_lancamento,
            data_embarque: formVenda.data_embarque || null,
          })
          .select()
          .single();

        if (vendaErr) throw vendaErr;

        vendaId = vendaData.id;

        // 2) INSERE RECIBOS
        for (const r of recibos) {
          const prod = produtos.find((p) => p.id === r.produto_id);
          if (!prod?.tipo_produto) {
            throw new Error("Produto do recibo não possui tipo vinculado.");
          }
          const { error } = await supabase.from("vendas_recibos").insert({
            venda_id: vendaId,
            produto_id: prod.tipo_produto, // FK espera tipo_produtos
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
    } catch (e: any) {
      console.error(e);
      const detalhes = e?.message || e?.error?.message || "";
      const cod = e?.code || e?.error?.code || "";
      setErro(`Erro ao salvar venda.${cod ? ` Código: ${cod}.` : ""}${detalhes ? ` Detalhes: ${detalhes}` : ""}`);
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
            Modo edição — altere cliente, cidade de destino, embarque e recibos.
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

            {/* CIDADE DE DESTINO */}
            <div className="form-group" style={{ position: "relative" }}>
              <label className="form-label">Cidade de Destino *</label>
              <input
                className="form-input"
                placeholder="Digite o nome da cidade"
                value={buscaDestino}
                onChange={(e) => handleCidadeDestino(e.target.value)}
                onFocus={() => setMostrarSugestoesCidade(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoesCidade(false), 150)}
                required
                style={{ marginBottom: 6 }}
              />
              {buscandoCidade && <div style={{ fontSize: 12, color: "#6b7280" }}>Buscando...</div>}
              {erroCidade && !buscandoCidade && (
                <div style={{ fontSize: 12, color: "#dc2626" }}>{erroCidade}</div>
              )}
              {mostrarSugestoesCidade && (buscandoCidade || buscaDestino.trim().length >= 2) && (
                <div
                  className="card-base"
                  style={{
                    marginTop: 4,
                    maxHeight: 180,
                    overflowY: "auto",
                    padding: 6,
                    border: "1px solid #e5e7eb",
                    position: "absolute",
                    zIndex: 5,
                    width: "100%",
                    background: "#fff",
                  }}
                >
                  {resultadosCidade.length === 0 && !buscandoCidade && buscaDestino.trim().length >= 2 && (
                    <div style={{ padding: "4px 6px", color: "#6b7280" }}>Nenhuma cidade encontrada.</div>
                  )}
                  {resultadosCidade.map((c) => {
                    const label = c.subdivisao_nome ? `${c.nome} (${c.subdivisao_nome})` : c.nome;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="btn btn-light"
                        style={{
                          width: "100%",
                          justifyContent: "flex-start",
                          marginBottom: 4,
                          background: formVenda.destino_id === c.id ? "#e0f2fe" : "#fff",
                          borderColor: formVenda.destino_id === c.id ? "#38bdf8" : "#e5e7eb",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormVenda((prev) => ({ ...prev, destino_id: c.id }));
                          setBuscaDestino(label);
                          setMostrarSugestoesCidade(false);
                          setResultadosCidade([]);
                        }}
                      >
                        {label}
                        {c.pais_nome ? <span style={{ color: "#6b7280", marginLeft: 6 }}>• {c.pais_nome}</span> : null}
                      </button>
                    );
                  })}
                </div>
              )}
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
                    list={`listaProdutos-${i}`}
                    placeholder="Selecione uma cidade primeiro e busque o produto..."
                    value={produtos.find((p) => p.id === r.produto_id)?.nome || buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    onBlur={() => {
                      const achado = produtosFiltrados.find(
                        (p) => p.nome.toLowerCase() === buscaProduto.toLowerCase()
                      );
                      if (achado) {
                        updateRecibo(i, "produto_id", achado.id);
                      }
                    }}
                    required
                    disabled={!formVenda.destino_id}
                  />
                  <datalist id={`listaProdutos-${i}`}>
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
