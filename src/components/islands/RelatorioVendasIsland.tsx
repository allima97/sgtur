import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
};

type Produto = {
  id: string;
  nome: string | null;
  tipo_produto: string | null;
  cidade_id: string | null;
};

type TipoProduto = {
  id: string;
  nome: string | null;
  tipo: string | null;
};

type Cidade = {
  id: string;
  nome: string;
};

type Venda = {
  id: string;
  numero_venda: string | null;
  cliente_id: string;
  destino_id: string;
  destino_cidade_id?: string | null;
  produto_id: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  valor_total: number | null;
  status: string | null;
  vendas_recibos?: {
    numero_recibo: string | null;
    valor_total: number | null;
    valor_taxas: number | null;
    produto_id: string | null;
    produto_resolvido_id?: string | null;
    tipo_produtos?: { id: string; nome: string | null; tipo: string | null } | null;
    produto_resolvido?: { id: string; nome: string | null; tipo: string | null } | null;
  }[];
  destino_produto?: { id: string; nome: string | null; tipo?: string | null } | null;
  cliente?: { nome: string | null; cpf: string | null } | null;
  destino?: { nome: string | null } | null;
  destino_cidade?: { nome: string | null } | null;
};

type ReciboEnriquecido = {
  id: string;
  venda_id: string;
  numero_venda: string | null;
  cliente_nome: string;
  cliente_cpf: string;
  destino_nome: string;
  produto_nome: string;
  produto_tipo: string;
  produto_tipo_id: string | null;
  cidade_nome: string;
  cidade_id: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  numero_recibo: string | null;
  valor_total: number;
  valor_taxas: number | null;
  status: string | null;
};

type StatusFiltro = "todos" | "aberto" | "confirmado" | "cancelado";

type Papel = "ADMIN" | "GESTOR" | "VENDEDOR" | "OUTRO";

type UserCtx = {
  usuarioId: string;
  papel: Papel;
  vendedorIds: string[];
};

type ExportFlags = {
  pdf: boolean;
  excel: boolean;
};

function hojeISO() {
  return new Date().toISOString().substring(0, 10);
}

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatISO(date: Date) {
  return date.toISOString().substring(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export default function RelatorioVendasIsland() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tiposProdutos, setTiposProdutos] = useState<TipoProduto[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);

  const [clienteBusca, setClienteBusca] = useState("");
  const [destinoBusca, setDestinoBusca] = useState("");

  const [cidadeNomeInput, setCidadeNomeInput] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("");
  const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = useState(false);
  const [cidadeSugestoes, setCidadeSugestoes] = useState<Cidade[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidade, setErroCidade] = useState<string | null>(null);

  const [tipoSelecionadoId, setTipoSelecionadoId] = useState("");

  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const [dataInicio, setDataInicio] = useState<string>(() => {
    const hoje = new Date();
    const inicio = addDays(hoje, -7);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = useState<string>(hojeISO());
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [valorMin, setValorMin] = useState<string>("");
  const [valorMax, setValorMax] = useState<string>("");

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [exportFlags, setExportFlags] = useState<ExportFlags>({ pdf: true, excel: true });

  useEffect(() => {
    async function carregarUserCtx() {
      try {
        setLoadingUser(true);
        setErro(null);

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          setErro("Usuário não autenticado.");
          return;
        }

        const { data: usuarioDb } = await supabase
          .from("users")
          .select("id, user_types(name), company_id")
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
          vendedorIds = [];
        }

        // carregar flags de exportação
        const companyId = (usuarioDb as any)?.company_id || null;
        if (companyId) {
          const { data: params } = await supabase
            .from("parametros_comissao")
            .select("exportacao_pdf, exportacao_excel")
            .eq("company_id", companyId)
            .maybeSingle();
          if (params) {
            setExportFlags({
              pdf: params.exportacao_pdf ?? true,
              excel: params.exportacao_excel ?? true,
            });
          }
        }

        setUserCtx({ usuarioId: userId, papel, vendedorIds });
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar contexto do usuário.");
      } finally {
        setLoadingUser(false);
      }
    }

    carregarUserCtx();
  }, []);

  useEffect(() => {
    async function carregarBase() {
      try {
        const [
          { data: clientesData, error: cliErr },
          { data: produtosData, error: prodErr },
          { data: tiposProdutosData, error: tiposErr },
          { data: cidadesData, error: cidadesErr },
        ] = await Promise.all([
          supabase.from("clientes").select("id, nome, cpf").order("nome", { ascending: true }),
          supabase.from("produtos").select("id, nome, tipo_produto, cidade_id").order("nome", { ascending: true }),
          supabase.from("tipo_produtos").select("id, nome, tipo").order("nome", { ascending: true }),
          supabase.from("cidades").select("id, nome").order("nome", { ascending: true }),
        ]);

        if (cliErr) throw cliErr;
        if (prodErr) throw prodErr;
        if (tiposErr) throw tiposErr;
        if (cidadesErr) throw cidadesErr;

      setClientes((clientesData || []) as Cliente[]);
      setProdutos((produtosData || []) as Produto[]);
      setTiposProdutos((tiposProdutosData || []) as TipoProduto[]);
      setCidades((cidadesData || []) as Cidade[]);
      } catch (e: any) {
        console.error(e);
        setErro(
          "Erro ao carregar bases de clientes e produtos. Verifique o Supabase."
        );
      }
    }

    carregarBase();
  }, []);

  useEffect(() => {
    if (cidadeNomeInput.trim().length < 2) {
      setCidadeSugestoes([]);
      setMostrarSugestoesCidade(false);
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
          { q: cidadeNomeInput.trim(), limite: 8 },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          if (error) {
            throw error;
          }
          setCidadeSugestoes((data || []) as Cidade[]);
          setMostrarSugestoesCidade(true);
        }
      } catch (e: any) {
        if (!controller.signal.aborted) {
          console.error("Erro ao buscar cidades:", e);
          setErroCidade("Erro ao buscar cidades. Tente novamente.");
          setCidadeSugestoes([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBuscandoCidade(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [cidadeNomeInput]);

  useEffect(() => {
    if (!cidadeFiltro) {
      return;
    }
    const matched = cidades.find((cidade) => cidade.id === cidadeFiltro);
    if (matched) {
      setCidadeNomeInput(matched.nome);
    }
  }, [cidadeFiltro, cidades]);

  const clientesFiltrados = useMemo(() => {
    if (!clienteBusca.trim()) return clientes;
    const termo = normalizeText(clienteBusca);
    return clientes.filter((c) => {
      const doc = c.cpf || "";
      return (
        normalizeText(c.nome).includes(termo) ||
        normalizeText(doc).includes(termo)
      );
    });
  }, [clientes, clienteBusca]);

  const tipoNomePorId = useMemo(() => {
    const map = new Map<string, string>();
    tiposProdutos.forEach((tipo) => {
      const tipoLabel = tipo.tipo?.trim() || "";
      const nomeRaw = tipo.nome?.trim() || "";
      const nomeLimpo = nomeRaw && !nomeRaw.startsWith("--") ? nomeRaw : "";
      const label = tipoLabel || nomeLimpo;
      if (label) {
        map.set(tipo.id, label);
      }
    });
    return map;
  }, [tiposProdutos]);

  const cidadePorId = useMemo(() => {
    const map = new Map<string, string>();
    cidades.forEach((cidade) => {
      if (cidade.id && cidade.nome) {
        map.set(cidade.id, cidade.nome);
      }
    });
    return map;
  }, [cidades]);

  const recibosEnriquecidos: ReciboEnriquecido[] = useMemo(() => {
    const cliMap = new Map(clientes.map((c) => [c.id, c]));
    const prodMap = new Map(produtos.map((p) => [p.id, p]));

    return vendas.flatMap((v) => {
      const c = cliMap.get(v.cliente_id) || v.cliente;
      const clienteNome = c?.nome || "(sem cliente)";
      const clienteCpf = c?.cpf || "";
      const produtoDestino = v.destino_produto;
      const recibos = v.vendas_recibos || [];

      return recibos.map((recibo, index) => {
        const produtoResolvido = recibo.produto_resolvido;
        const tipoRegistro = recibo.tipo_produtos;
        const tipoId =
          tipoRegistro?.id ||
          produtoResolvido?.tipo_produto ||
          produtoDestino?.tipo_produto ||
          prodMap.get(recibo.produto_id || "")?.tipo_produto ||
          null;
        const tipoLabel =
          tipoRegistro?.nome ||
          tipoRegistro?.tipo ||
          tipoNomePorId.get(tipoId || "") ||
          tipoId ||
          "(sem tipo)";
        const produtoNome =
          produtoResolvido?.nome ||
          produtoDestino?.nome ||
          tipoLabel ||
          "(sem produto)";
        const destinoNome =
          produtoDestino?.nome ||
          produtoResolvido?.nome ||
          v.destino?.nome ||
          "(sem destino)";
        const cidadeId =
          v.destino_cidade_id ||
          produtoResolvido?.cidade_id ||
          produtoDestino?.cidade_id ||
          prodMap.get(recibo.produto_id || "")?.cidade_id ||
          null;
        const vendaCidadeNome = v.destino_cidade?.nome || "";
        const cidadeNome =
          vendaCidadeNome ||
          (cidadeId && cidadePorId.get(cidadeId) ? cidadePorId.get(cidadeId)! : "");

        return {
          id: `${v.id}-${index}-${recibo.numero_recibo || "recibo"}`,
          venda_id: v.id,
          numero_venda: v.numero_venda || v.id,
          cliente_nome: clienteNome,
          cliente_cpf: clienteCpf,
          destino_nome: destinoNome,
          produto_nome: produtoNome,
          produto_tipo: tipoLabel,
          produto_tipo_id: tipoId,
          cidade_nome: cidadeNome,
          cidade_id: cidadeId,
          data_lancamento: v.data_lancamento,
          data_embarque: v.data_embarque,
          numero_recibo: recibo.numero_recibo,
          valor_total: recibo.valor_total ?? 0,
          valor_taxas: recibo.valor_taxas ?? null,
          status: v.status,
        };
      });
    });
  }, [vendas, clientes, produtos, tipoNomePorId]);

  const recibosFiltrados = useMemo(() => {
    const termProd = normalizeText(destinoBusca.trim());
    const termCidade = normalizeText(cidadeNomeInput.trim());
    return recibosEnriquecidos.filter((recibo) => {
      const matchTipo =
        !tipoSelecionadoId || recibo.produto_tipo_id === tipoSelecionadoId;
      const matchCidade =
        !cidadeFiltro && !termCidade
          ? true
          : cidadeFiltro
          ? recibo.cidade_id === cidadeFiltro
          : normalizeText(recibo.cidade_nome || "").includes(termCidade);
      const nomeProduto = normalizeText(recibo.produto_nome || "");
      const matchProduto = !termProd || nomeProduto.includes(termProd);
      return matchTipo && matchCidade && matchProduto;
    });
  }, [recibosEnriquecidos, destinoBusca, tipoSelecionadoId, cidadeFiltro, cidadeNomeInput]);

  const totalRecibos = recibosFiltrados.length;
  const somaValores = recibosFiltrados.reduce((acc, v) => {
    const val = v.valor_total ?? 0;
    return acc + val;
  }, 0);
  const ticketMedio = totalRecibos > 0 ? somaValores / totalRecibos : 0;

  async function carregarVendas() {
    if (!userCtx) return;
    try {
      setLoading(true);
      setErro(null);

        let query = supabase
        .from("vendas")
        .select(
          `
          id,
          vendedor_id,
          numero_venda,
          cliente_id,
          destino_id,
          destino_cidade_id,
          produto_id,
          data_lancamento,
          data_embarque,
          valor_total,
          status,
          cliente:clientes!cliente_id (nome, cpf),
          destino_produto:produtos!destino_id (id, nome, tipo_produto, cidade_id),
          destino_cidade:cidades!destino_cidade_id (nome),
          vendas_recibos (
            numero_recibo,
            valor_total,
            valor_taxas,
            produto_id,
            produto_resolvido_id,
            produto_resolvido:produtos!produto_resolvido_id (id, nome, tipo_produto, cidade_id),
            tipo_produtos (id, nome, tipo)
          )
        `
        )
        .order("data_lancamento", { ascending: false });

      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }

      if (dataInicio) {
        query = query.gte("data_lancamento", dataInicio);
      }
      if (dataFim) {
        query = query.lte("data_lancamento", dataFim);
      }
      if (statusFiltro !== "todos") {
        query = query.eq("status", statusFiltro);
      }
      if (clienteSelecionado) {
        query = query.eq("cliente_id", clienteSelecionado.id);
      }

      const vMin = parseFloat(valorMin.replace(",", "."));
      if (!isNaN(vMin)) {
        query = query.gte("valor_total", vMin);
      }
      const vMax = parseFloat(valorMax.replace(",", "."));
      if (!isNaN(vMax)) {
        query = query.lte("valor_total", vMax);
      }

      const { data, error } = await query;

      if (error) throw error;

      setVendas((data || []) as Venda[]);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar vendas para o relatório. Confira o schema e filtros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userCtx) {
      carregarVendas();
    }
  }, [userCtx]);

  function aplicarPeriodoPreset(tipo: "hoje" | "7" | "30" | "mes_atual" | "mes_anterior" | "limpar") {
    const hoje = new Date();

    if (tipo === "limpar") {
      setDataInicio("");
      setDataFim("");
      return;
    }

    if (tipo === "hoje") {
      const iso = hojeISO();
      setDataInicio(iso);
      setDataFim(iso);
      return;
    }

    if (tipo === "7") {
      const inicio = addDays(hoje, -7);
      setDataInicio(formatISO(inicio));
      setDataFim(hojeISO());
      return;
    }

    if (tipo === "30") {
      const inicio = addDays(hoje, -30);
      setDataInicio(formatISO(inicio));
      setDataFim(hojeISO());
      return;
    }

    if (tipo === "mes_atual") {
      const inicio = startOfMonth(hoje);
      const fim = endOfMonth(hoje);
      setDataInicio(formatISO(inicio));
      setDataFim(formatISO(fim));
      return;
    }

    if (tipo === "mes_anterior") {
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const inicio = startOfMonth(mesAnterior);
      const fim = endOfMonth(mesAnterior);
      setDataInicio(formatISO(inicio));
      setDataFim(formatISO(fim));
      return;
    }
  }

  function exportarCSV() {
    if (recibosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const header = [
      "numero_recibo",
      "cliente",
      "cpf",
      "tipo_produto",
      "cidade",
      "produto",
      "data_lancamento",
      "data_embarque",
      "valor_total",
    ];

    const linhas = recibosFiltrados.map((r) => [
      r.numero_recibo || "",
      r.cliente_nome,
      r.cliente_cpf || "",
      r.produto_tipo,
      r.cidade_nome,
      r.produto_nome,
      r.data_lancamento || "",
      r.data_embarque || "",
      (r.valor_total ?? 0).toString().replace(".", ","),
    ]);

    const all = [header, ...linhas]
      .map((cols) => cols.map((c) => csvEscape(c)).join(";"))
      .join("\n");

    const blob = new Blob([all], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio-vendas-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportarExcel() {
    if (!exportFlags.excel) {
      alert("Exportação Excel desabilitada nos parâmetros.");
      return;
    }
    if (recibosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const data = recibosFiltrados.map((r) => ({
      "Número recibo": r.numero_recibo || "",
      Cliente: r.cliente_nome,
      CPF: r.cliente_cpf,
      "Tipo produto": r.produto_tipo,
      Cidade: r.cidade_nome,
      Produto: r.produto_nome,
      "Data lançamento": r.data_lancamento?.slice(0, 10) || "",
      "Data embarque": r.data_embarque?.slice(0, 10) || "",
      "Valor total": r.valor_total ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");

    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
    XLSX.writeFile(wb, `relatorio-vendas-${ts}.xlsx`);
  }

  function exportarPDF() {
    if (!exportFlags.pdf) {
      alert("Exportação PDF desabilitada nos parâmetros.");
      return;
    }
    if (recibosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const win = window.open("", "_blank");
    if (!win) {
      alert("Não foi possível abrir a janela de exportação.");
      return;
    }

        const rows = recibosFiltrados
      .map(
        (r) => {
          const valorFormatado = (r.valor_total ?? 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
          return `
        <tr>
          <td>${r.data_lancamento?.slice(0, 10) || ""}</td>
          <td>${r.numero_recibo || ""}</td>
          <td>${r.cliente_nome || ""}</td>
          <td>${r.cliente_cpf || ""}</td>
          <td>${r.produto_tipo || ""}</td>
          <td>${r.cidade_nome || ""}</td>
          <td>${r.produto_nome || ""}</td>
          <td>${r.data_embarque?.slice(0, 10) || ""}</td>
          <td>${valorFormatado}</td>
        </tr>`;
        }
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Relatório de Vendas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h3>Relatório de Vendas</h3>
          <table>
          <thead>
            <tr>
                <th>Data lançamento</th>
                <th>Nº Recibo</th>
                <th>Cliente</th>
                <th>CPF</th>
                <th>Tipo produto</th>
                <th>Cidade</th>
                <th>Produto</th>
                <th>Data embarque</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="relatorio-vendas-page">
      {loadingUser && (
        <div className="card-base card-config mb-3">Carregando contexto do usuário...</div>
      )}
      {userCtx && userCtx.papel !== "ADMIN" && (
        <div className="card-base card-config mb-3" style={{ color: "#334155" }}>
          Relatório limitado a {userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas"}.
        </div>
      )}
      <div className="card-base card-purple mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data início</label>
            <input
              type="date"
              className="form-input"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data fim</label>
            <input
              type="date"
              className="form-input"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
            >
              <option value="todos">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Valor mínimo</label>
            <input
              className="form-input"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Valor máximo</label>
            <input
              className="form-input"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 8 }}>
          <div className="form-group">
            <label className="form-label">Cliente</label>
            <input
              className="form-input"
              value={clienteBusca}
              onChange={(e) => {
                setClienteBusca(e.target.value);
                setClienteSelecionado(null);
              }}
              placeholder="Nome ou CPF..."
            />
            {clienteBusca && !clienteSelecionado && (
              <div className="card-base" style={{ marginTop: 4, maxHeight: 180, overflowY: "auto" }}>
                {clientesFiltrados.length === 0 && (
                  <div style={{ fontSize: "0.85rem" }}>Nenhum cliente encontrado.</div>
                )}
                {clientesFiltrados.map((c) => (
                  <div
                    key={c.id}
                    style={{ padding: "4px 6px", cursor: "pointer" }}
                    onClick={() => {
                      setClienteSelecionado(c);
                      setClienteBusca(c.nome);
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.nome}</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                      {c.cpf || "Sem CPF"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {clienteSelecionado && (
              <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Selecionado: <strong>{clienteSelecionado.nome}</strong>
              </div>
            )}
          </div>

          <div className="form-group relative">
            <label className="form-label">Cidade</label>
            <input
              className="form-input"
              placeholder="Digite a cidade"
              value={cidadeNomeInput}
              onChange={(e) => {
                const value = e.target.value;
                setCidadeNomeInput(value);
                setCidadeFiltro("");
                if (value.trim().length > 0) {
                  setMostrarSugestoesCidade(true);
                }
              }}
              onFocus={() => {
                if (cidadeNomeInput.trim().length >= 2) {
                  setMostrarSugestoesCidade(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setMostrarSugestoesCidade(false), 150);
                if (!cidadeNomeInput.trim()) {
                  setCidadeFiltro("");
                  return;
                }
                const match = cidades.find((cidade) =>
                  normalizeText(cidade.nome) === normalizeText(cidadeNomeInput)
                );
                if (match) {
                  setCidadeFiltro(match.id);
                  setCidadeNomeInput(match.nome);
                }
              }}
            />
            {mostrarSugestoesCidade && cidadeNomeInput.trim().length >= 1 && (
              <div
                className="card-base card-config"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: 180,
                  overflowY: "auto",
                  zIndex: 20,
                  padding: "4px 0",
                }}
              >
                {buscandoCidade && (
                  <div style={{ padding: "6px 12px", color: "#64748b" }}>
                    Buscando cidades...
                  </div>
                )}
                {!buscandoCidade && erroCidade && (
                  <div style={{ padding: "6px 12px", color: "#dc2626" }}>
                    {erroCidade}
                  </div>
                )}
                {!buscandoCidade && !erroCidade && cidadeSugestoes.length === 0 && (
                  <div style={{ padding: "6px 12px", color: "#94a3b8" }}>
                    Nenhuma cidade encontrada.
                  </div>
                )}
                {!buscandoCidade &&
                  !erroCidade &&
                  cidadeSugestoes.map((cidade) => (
                    <button
                      key={cidade.id}
                      type="button"
                      className="btn btn-ghost w-full text-left"
                      style={{ padding: "6px 12px" }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setCidadeFiltro(cidade.id);
                        setCidadeNomeInput(cidade.nome);
                        setMostrarSugestoesCidade(false);
                      }}
                    >
                      {cidade.nome}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Tipo Produto</label>
            <select
              className="form-select"
              value={tipoSelecionadoId}
              onChange={(e) => setTipoSelecionadoId(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              {tiposProdutos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome || tipo.tipo || `(ID: ${tipo.id})`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Produto</label>
            <input
              className="form-input"
              value={destinoBusca}
              onChange={(e) => setDestinoBusca(e.target.value)}
              placeholder="Nome do produto..."
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("hoje")}
          >
            Hoje
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("7")}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("30")}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("mes_atual")}
          >
            Este mês
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("mes_anterior")}
          >
            Mês anterior
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("limpar")}
          >
            Limpar datas
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={carregarVendas}
          >
            Aplicar filtros
          </button>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-purple"
              onClick={exportarCSV}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={exportarExcel}
              disabled={!exportFlags.excel}
              title={!exportFlags.excel ? "Exportação Excel desabilitada nos parâmetros" : ""}
            >
              Exportar Excel
            </button>
            <button
              type="button"
              className="btn btn-light"
              onClick={exportarPDF}
              disabled={!exportFlags.pdf}
              title={!exportFlags.pdf ? "Exportação PDF desabilitada nos parâmetros" : ""}
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <span style={{ fontSize: "0.9rem" }}>
              <strong>{totalRecibos}</strong> recibo(s) encontrado(s)
            </span>
          </div>
          <div className="form-group">
            <span style={{ fontSize: "0.9rem" }}>
              Faturamento:{" "}
              <strong>
                {somaValores.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </span>
          </div>
          <div className="form-group">
            <span style={{ fontSize: "0.9rem" }}>
              Ticket médio:{" "}
              <strong>
                {ticketMedio.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-purple min-w-[1100px]">
          <thead>
            <tr>
              <th>Data lançamento</th>
              <th>Nº Recibo</th>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Tipo produto</th>
              <th>Cidade</th>
              <th>Produto</th>
              <th>Data embarque</th>
              <th>Valor total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
                <tr>
                <td colSpan={9}>Carregando vendas...</td>
              </tr>
            )}

            {!loading && recibosFiltrados.length === 0 && (
              <tr>
                <td colSpan={9}>Nenhum recibo encontrado com os filtros atuais.</td>
              </tr>
            )}

            {!loading &&
              recibosFiltrados.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.data_lancamento
                      ? new Date(r.data_lancamento).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>{r.numero_recibo || "-"}</td>
                  <td>{r.cliente_nome}</td>
                  <td>{r.cliente_cpf}</td>
                  <td>{r.produto_tipo}</td>
                  <td>{r.cidade_nome || "-"}</td>
                  <td>{r.produto_nome}</td>
                  <td>
                    {r.data_embarque
                      ? new Date(r.data_embarque).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    {r.valor_total != null
                      ? r.valor_total.toLocaleString("pt-BR", {
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
  );
}
