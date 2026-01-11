import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type Cliente = { id: string; nome: string };
type Cidade = { id: string; nome: string; subdivisao_nome?: string | null; pais_nome?: string | null };
type TipoProduto = { id: string; nome: string | null; tipo?: string | null };
type Produto = {
  id: string;
  nome: string | null;
  cidade_id: string | null;
  tipo_produto: string | null;
  todas_as_cidades?: boolean | null;
};

type ProdutoItem = {
  id: string;
  cidadeId: string;
  cidadeNome: string;
  tipoProdutoId: string;
  produtoId: string;
  periodoInicio: string;
  periodoFim: string;
  valor: string;
};

type OrcamentosCadastroProps = {
  suppressLoadingMessage?: boolean;
};

export default function OrcamentosCadastroIsland({
  suppressLoadingMessage = false,
}: OrcamentosCadastroProps) {
  const { ativo, loading: loadingPerm } = usePermissao("Vendas");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tipos, setTipos] = useState<TipoProduto[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<ProdutoItem[]>([]);
  const [cidadeBusca, setCidadeBusca] = useState("");
  const [cidadesSugestoes, setCidadesSugestoes] = useState<Cidade[]>([]);
  const [cidadeBuscaAtivaId, setCidadeBuscaAtivaId] = useState<string | null>(null);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidade, setErroCidade] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    carregarListas();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const abrir = () => setMostrarForm(true);
    const fechar = () => setMostrarForm(false);
    window.addEventListener("abrir-formulario-orcamento", abrir);
    window.addEventListener("fechar-formulario-orcamento", fechar);
    return () => {
      window.removeEventListener("abrir-formulario-orcamento", abrir);
      window.removeEventListener("fechar-formulario-orcamento", fechar);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("formulario-orcamento-status", { detail: { aberto: mostrarForm } })
    );
  }, [mostrarForm]);

  useEffect(() => {
    const termo = cidadeBusca.trim();
    if (termo.length < 2) {
      setCidadesSugestoes([]);
      setErroCidade(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBuscandoCidade(true);
      setErroCidade(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: termo, limite: 8 },
          { signal: controller.signal }
        );
        if (error) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_nome, pais_nome")
            .ilike("nome", `%${termo}%`)
            .order("nome")
            .limit(8);
          if (fallbackError) throw fallbackError;
          setCidadesSugestoes((fallbackData as Cidade[]) || []);
        } else {
          setCidadesSugestoes((data as Cidade[]) || []);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setErroCidade("Erro ao buscar cidades.");
          setCidadesSugestoes([]);
        }
      } finally {
        if (!controller.signal.aborted) setBuscandoCidade(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [cidadeBusca]);

  async function carregarListas() {
    try {
      const [c, tiposResp, produtosResp] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase
          .from("tipo_produtos")
          .select("id, nome, tipo")
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("produtos")
          .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
          .eq("ativo", true)
          .order("nome"),
      ]);

      if (c.data) setClientes(c.data as Cliente[]);
      if (tiposResp.data) setTipos(tiposResp.data as TipoProduto[]);
      if (produtosResp.data) {
        const lista = (produtosResp.data as Produto[]).map((p) => ({
          ...p,
          todas_as_cidades: p.todas_as_cidades ?? false,
        }));
        setProdutos(lista);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar listas.");
    }
  }

  function normalizarTexto(valor: string) {
    return (valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function formatarCidadeLabel(cidade: Cidade) {
    const detalhe = cidade.subdivisao_nome || cidade.pais_nome || "";
    return detalhe ? `${cidade.nome} - ${detalhe}` : cidade.nome;
  }

  function addDaysIso(dateIso: string, days: number) {
    if (!dateIso) return "";
    const parts = dateIso.split("-").map(Number);
    if (parts.length !== 3) return "";
    const [year, month, day] = parts;
    if (!year || !month || !day) return "";
    const base = new Date(Date.UTC(year, month - 1, day, 12));
    base.setUTCDate(base.getUTCDate() + days);
    return base.toISOString().slice(0, 10);
  }

  function criarId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  }

  function criarItem(): ProdutoItem {
    return {
      id: criarId(),
      cidadeId: "",
      cidadeNome: "",
      tipoProdutoId: "",
      produtoId: "",
      periodoInicio: "",
      periodoFim: "",
      valor: "",
    };
  }

  function atualizarItem(itemId: string, updates: Partial<ProdutoItem>) {
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const next = { ...item, ...updates };
        if (
          (updates.cidadeId !== undefined && updates.cidadeId !== item.cidadeId) ||
          (updates.cidadeNome !== undefined && updates.cidadeNome !== item.cidadeNome)
        ) {
          next.produtoId = "";
        }
        if (updates.tipoProdutoId !== undefined && updates.tipoProdutoId !== item.tipoProdutoId) {
          next.produtoId = "";
        }
        return next;
      })
    );
  }

  function adicionarItem() {
    setItens((prev) => [...prev, criarItem()]);
  }

  function removerItem(itemId: string) {
    setItens((prev) => prev.filter((item) => item.id !== itemId));
  }

  function handleCidadeInput(itemId: string, valor: string) {
    atualizarItem(itemId, { cidadeNome: valor, cidadeId: "" });
    setCidadeBusca(valor);
    setCidadeBuscaAtivaId(itemId);
    const match = cidadesSugestoes.find((cidade) => {
      const label = formatarCidadeLabel(cidade);
      return (
        normalizarTexto(label) === normalizarTexto(valor) ||
        normalizarTexto(cidade.nome) === normalizarTexto(valor)
      );
    });
    if (match) {
      atualizarItem(itemId, { cidadeId: match.id, cidadeNome: formatarCidadeLabel(match) });
    }
  }

  function handleCidadeBlur(itemId: string) {
    const item = itens.find((i) => i.id === itemId);
    if (!item) return;
    const match = cidadesSugestoes.find((cidade) => {
      const label = formatarCidadeLabel(cidade);
      return (
        normalizarTexto(label) === normalizarTexto(item.cidadeNome) ||
        normalizarTexto(cidade.nome) === normalizarTexto(item.cidadeNome)
      );
    });
    if (match) {
      atualizarItem(itemId, { cidadeId: match.id, cidadeNome: formatarCidadeLabel(match) });
    }
  }

  function produtosFiltrados(item: ProdutoItem) {
    if (!item.cidadeId || !item.tipoProdutoId) return [];
    return produtos.filter((produto) => {
      if (produto.tipo_produto !== item.tipoProdutoId) return false;
      return produto.todas_as_cidades || produto.cidade_id === item.cidadeId;
    });
  }

  function limparFormularioOrcamento() {
    setClienteId("");
    setItens([]);
    setCidadeBusca("");
    setCidadesSugestoes([]);
    setCidadeBuscaAtivaId(null);
    setErro(null);
    setSucesso(null);
  }

  function fecharFormulario() {
    limparFormularioOrcamento();
    setMostrarForm(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!clienteId) {
      setErro("Cliente é obrigatório.");
      return;
    }

    if (!itens.length) {
      setErro("Adicione ao menos um produto.");
      return;
    }

    const indexInvalido = itens.findIndex(
      (item) =>
        !item.cidadeId ||
        !item.tipoProdutoId ||
        !item.produtoId ||
        !item.periodoInicio ||
        !item.valor
    );
    if (indexInvalido >= 0) {
      setErro(`Preencha todos os campos do produto ${indexInvalido + 1}.`);
      return;
    }

    try {
      setSalvando(true);
      const itensNormalizados = itens.map((item) => {
        const inicio = item.periodoInicio || "";
        const fim = item.periodoFim || item.periodoInicio || "";
        return {
          ...item,
          periodoInicio: inicio,
          periodoFim: fim,
          valorNumero: item.valor ? parseFloat(item.valor) : 0,
        };
      });
      const totalValor = itensNormalizados.reduce((sum, item) => sum + (item.valorNumero || 0), 0);
      const dataViagem = itensNormalizados
        .map((item) => item.periodoInicio)
        .filter(Boolean)
        .sort()[0] || null;
      const linhasNotas = itensNormalizados.map((item, index) => {
        const tipoEncontrado = tipos.find((tipo) => tipo.id === item.tipoProdutoId);
        const tipoLabel = tipoEncontrado?.nome || tipoEncontrado?.tipo || "Tipo";
        const produtoLabel =
          produtos.find((produto) => produto.id === item.produtoId)?.nome || "Produto";
        const periodoLabel =
          item.periodoFim && item.periodoFim !== item.periodoInicio
            ? `${item.periodoInicio} a ${item.periodoFim}`
            : item.periodoInicio;
        return `${index + 1}. ${item.cidadeNome} | ${tipoLabel} | ${produtoLabel} | ${periodoLabel} | R$ ${item.valorNumero.toFixed(2)}`;
      });
      const notas =
        itensNormalizados.length > 1
          ? `Itens do orçamento:\n${linhasNotas.join("\n")}`
          : linhasNotas[0] || null;
      const primeiro = itensNormalizados[0];
      const payload = {
        cliente_id: clienteId,
        destino_id: primeiro?.produtoId || null,
        produto_id: primeiro?.tipoProdutoId || null,
        status: "novo",
        valor: totalValor || null,
        data_viagem: dataViagem,
        notas,
      };

      const { data: orcamentoCriado, error } = await supabase
        .from("orcamentos")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      const itensPayload = itensNormalizados.map((item) => ({
        orcamento_id: orcamentoCriado?.id,
        cidade_id: item.cidadeId || null,
        tipo_produto_id: item.tipoProdutoId || null,
        produto_id: item.produtoId || null,
        periodo_inicio: item.periodoInicio || null,
        periodo_fim: item.periodoFim || item.periodoInicio || null,
        valor: item.valorNumero || 0,
      }));
      const { error: itensError } = await supabase.from("orcamento_itens").insert(itensPayload);
      if (itensError) {
        const mensagem = itensError.message || "";
        const tabelaInexistente =
          itensError.code === "PGRST205" ||
          itensError.status === 404 ||
          /schema cache/i.test(mensagem) ||
          /Could not find the table/i.test(mensagem);
        if (tabelaInexistente) {
          setSucesso(
            'Orçamento criado, mas os itens não foram gravados. Aplique a migration "20260111_orcamento_itens.sql".'
          );
          window.dispatchEvent(new CustomEvent("orcamento-criado"));
          limparFormularioOrcamento();
          setMostrarForm(false);
          return;
        }
        if (orcamentoCriado?.id) {
          await supabase.from("orcamentos").delete().eq("id", orcamentoCriado.id);
        }
        throw itensError;
      }

      setSucesso(
        `Orçamento criado com ${itensNormalizados.length} produto${itensNormalizados.length > 1 ? "s" : ""}.`
      );
      window.dispatchEvent(new CustomEvent("orcamento-criado"));
      limparFormularioOrcamento();
      setMostrarForm(false);
    } catch (e) {
      console.error(e);
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Erro ao salvar orçamento.";
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  }

  if (loadingPerm) {
    return suppressLoadingMessage ? null : <LoadingUsuarioContext className="mb-3" />;
  }

  if (!ativo) return <div>Acesso ao módulo de Vendas bloqueado.</div>;
  if (!mostrarForm) return null;

  return (
    <div className="card-base card-blue mb-3">
      <h2 className="card-title font-semibold text-lg">Novo Orçamento</h2>

      {erro && <div className="auth-error text-red-600 font-medium mb-2">{erro}</div>}
      {sucesso && (
        <div className="auth-success text-slate-900 font-bold mb-2">{sucesso}</div>
      )}

      <form onSubmit={salvar} className="flex flex-col gap-4">
        <div className="card-base">
          <div className="form-row flex flex-col md:flex-row gap-3">
            <div className="form-group flex-1 min-w-[240px]">
              <label className="form-label">Cliente *</label>
              <select
                className="form-select"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-light"
              onClick={adicionarItem}
              disabled={salvando}
            >
              Adicionar produto
            </button>
          </div>
        </div>

        {itens.length > 0 && (
          <div className="card-base">
            <h3 className="card-title font-semibold text-base">Produtos do orçamento</h3>
            <datalist id="cidades-orcamento-list">
              {cidadesSugestoes.map((cidade) => (
                <option key={cidade.id} value={formatarCidadeLabel(cidade)} />
              ))}
            </datalist>
            <div className="table-container overflow-x-auto" style={{ marginTop: 12 }}>
              <table className="table-default min-w-[1200px]">
                <thead>
                  <tr>
                    <th>Cidade</th>
                    <th>Tipo de produto</th>
                    <th>Produto</th>
                    <th>Período de</th>
                    <th>Período até</th>
                    <th>Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, index) => {
                    const produtosDisponiveis = produtosFiltrados(item);
                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            className="form-input"
                            list="cidades-orcamento-list"
                            value={item.cidadeNome}
                            onChange={(e) => handleCidadeInput(item.id, e.target.value)}
                            onBlur={() => handleCidadeBlur(item.id)}
                            placeholder="Buscar cidade"
                          />
                          {erroCidade && cidadeBuscaAtivaId === item.id && (
                            <div className="text-xs text-red-600 mt-1">{erroCidade}</div>
                          )}
                          {buscandoCidade && cidadeBuscaAtivaId === item.id && (
                            <div className="text-xs text-slate-500 mt-1">Buscando...</div>
                          )}
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={item.tipoProdutoId}
                            onChange={(e) => atualizarItem(item.id, { tipoProdutoId: e.target.value })}
                          >
                            <option value="">Selecione</option>
                            {tipos.map((tipo) => (
                              <option key={tipo.id} value={tipo.id}>
                                {tipo.nome || tipo.tipo || "-"}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={item.produtoId}
                            onChange={(e) => atualizarItem(item.id, { produtoId: e.target.value })}
                            disabled={!item.cidadeId || !item.tipoProdutoId}
                          >
                            <option value="">
                              {item.cidadeId && item.tipoProdutoId
                                ? produtosDisponiveis.length
                                  ? "Selecione"
                                  : "Nenhum produto encontrado"
                                : "Selecione cidade e tipo"}
                            </option>
                            {produtosDisponiveis.map((produto) => (
                              <option key={produto.id} value={produto.id}>
                                {produto.nome || "Produto sem nome"}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="date"
                            value={item.periodoInicio}
                            onChange={(e) => {
                              const novoInicio = e.target.value;
                              const minFim = novoInicio ? addDaysIso(novoInicio, 1) : "";
                              const updates: Partial<ProdutoItem> = { periodoInicio: novoInicio };
                              if (item.periodoFim && minFim && item.periodoFim < minFim) {
                                updates.periodoFim = minFim;
                              }
                              atualizarItem(item.id, updates);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="date"
                            value={item.periodoFim}
                            min={item.periodoInicio ? addDaysIso(item.periodoInicio, 1) : undefined}
                            onChange={(e) => {
                              const valor = e.target.value;
                              const minFim = item.periodoInicio
                                ? addDaysIso(item.periodoInicio, 1)
                                : "";
                              if (minFim && valor && valor < minFim) {
                                atualizarItem(item.id, { periodoFim: minFim });
                                return;
                              }
                              atualizarItem(item.id, { periodoFim: valor });
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.valor}
                            onChange={(e) => atualizarItem(item.id, { valor: e.target.value })}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => removerItem(item.id)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn btn-light"
                onClick={adicionarItem}
                disabled={salvando}
              >
                Adicionar produto
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={fecharFormulario}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {itens.length === 0 && (
          <div className="mt-2 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              className="btn btn-light"
              onClick={fecharFormulario}
              disabled={salvando}
            >
              Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
