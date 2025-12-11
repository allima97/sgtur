import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";

type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
};

type Destino = {
  id: string;
  nome: string;
};

type Produto = {
  id: string;
  nome: string | null;
  tipo: string;
};

type Venda = {
  id: string;
  numero_venda: string | null;
  cliente_id: string;
  destino_id: string;
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
    tipo_produtos?: { id: string; nome: string | null; tipo: string | null } | null;
  }[];
};

type VendaEnriquecida = Venda & {
  cliente_nome: string;
  cliente_cpf: string;
  destino_nome: string;
  produto_nome: string;
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
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [clienteBusca, setClienteBusca] = useState("");
  const [destinoBusca, setDestinoBusca] = useState("");
  const [produtoBusca, setProdutoBusca] = useState("");

  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [destinoSelecionado, setDestinoSelecionado] = useState<Destino | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

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
          { data: destinosData, error: destErr },
          { data: produtosData, error: prodErr },
        ] =
          await Promise.all([
            supabase.from("clientes").select("id, nome, cpf").order("nome", { ascending: true }),
            supabase.from("produtos").select("id, nome").order("nome", { ascending: true }),
            supabase.from("tipo_produtos").select("id, nome, tipo").order("nome", { ascending: true }),
          ]);

        if (cliErr) throw cliErr;
        if (destErr) throw destErr;
        if (prodErr) throw prodErr;

        setClientes((clientesData || []) as Cliente[]);
        setDestinos((destinosData || []) as Destino[]);
        setProdutos((produtosData || []) as Produto[]);
      } catch (e: any) {
        console.error(e);
        setErro(
          "Erro ao carregar bases de clientes, destinos e produtos. Verifique o Supabase."
        );
      }
    }

    carregarBase();
  }, []);

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

  const destinosFiltrados = useMemo(() => {
    if (!destinoBusca.trim()) return destinos;
    const termo = normalizeText(destinoBusca);
    return destinos.filter((d) => normalizeText(d.nome).includes(termo));
  }, [destinos, destinoBusca]);

  const produtosFiltrados = useMemo(() => {
    if (!produtoBusca.trim()) return produtos;
    const termo = normalizeText(produtoBusca);
    return produtos.filter((p) => {
      const nome = normalizeText(p.nome || "");
      const tipo = normalizeText(p.tipo || "");
      return nome.includes(termo) || tipo.includes(termo);
    });
  }, [produtos, produtoBusca]);

  const vendasEnriquecidas: VendaEnriquecida[] = useMemo(() => {
    const cliMap = new Map(clientes.map((c) => [c.id, c]));
    const destMap = new Map(destinos.map((d) => [d.id, d]));
    const prodMap = new Map(produtos.map((p) => [p.id, p]));

    return vendas.map((v) => {
      const c = cliMap.get(v.cliente_id);
      const d = destMap.get(v.destino_id);
      const p = v.produto_id ? prodMap.get(v.produto_id) : undefined;
      const recibos = v.vendas_recibos || [];
      const numeroRecibos = recibos.map((r) => r.numero_recibo).filter(Boolean).join(" / ");
      const valorRecibos = recibos.reduce(
        (acc, r) => acc + Number(r.valor_total || 0) + Number(r.valor_taxas || 0),
        0
      );
      const prodRecibo = recibos.find((r) => r.tipo_produtos?.id);
      const valorCalculado = valorRecibos > 0 ? valorRecibos : v.valor_total ?? null;

      return {
        ...v,
        numero_venda: v.numero_venda || numeroRecibos || v.id,
        valor_total: valorCalculado,
        cliente_nome: c?.nome || "(sem cliente)",
        cliente_cpf: c?.cpf || "",
        destino_nome: d?.nome || "(sem destino)",
        produto_nome:
          p?.nome ||
          p?.tipo ||
          prodRecibo?.tipo_produtos?.nome ||
          prodRecibo?.tipo_produtos?.tipo ||
          "(sem produto)",
      };
    });
  }, [vendas, clientes, destinos, produtos]);

  const totalVendas = vendasEnriquecidas.length;
  const somaValores = vendasEnriquecidas.reduce((acc, v) => {
    const val = v.valor_total ?? 0;
    return acc + val;
  }, 0);
  const ticketMedio = totalVendas > 0 ? somaValores / totalVendas : 0;

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
          produto_id,
          data_lancamento,
          data_embarque,
          valor_total,
          status,
          vendas_recibos (
            numero_recibo,
            valor_total,
            valor_taxas,
            produto_id,
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
      if (destinoSelecionado) {
        query = query.eq("destino_id", destinoSelecionado.id);
      }
      if (produtoSelecionado) {
        query = query.eq("produto_id", produtoSelecionado.id);
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
    if (vendasEnriquecidas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const header = [
      "numero_venda",
      "cliente",
      "cpf",
      "destino",
      "produto",
      "data_lancamento",
      "data_embarque",
      "status",
      "valor_total",
    ];

    const linhas = vendasEnriquecidas.map((v) => [
      v.numero_venda || "",
      v.cliente_nome,
      v.cliente_cpf || "",
      v.destino_nome,
      v.produto_nome,
      v.data_lancamento || "",
      v.data_embarque || "",
      v.status || "",
      (v.valor_total ?? 0).toString().replace(".", ","),
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
    if (vendasEnriquecidas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const data = vendasEnriquecidas.map((v) => ({
      "Nº Venda": v.numero_venda || v.id,
      Cliente: v.cliente_nome,
      CPF: v.cliente_cpf,
      Destino: v.destino_nome,
      Produto: v.produto_nome,
      "Data lançamento": v.data_lancamento?.slice(0, 10) || "",
      "Data embarque": v.data_embarque?.slice(0, 10) || "",
      Status: v.status || "",
      "Valor total": v.valor_total ?? 0,
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
    if (vendasEnriquecidas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const win = window.open("", "_blank");
    if (!win) {
      alert("Não foi possível abrir a janela de exportação.");
      return;
    }

    const rows = vendasEnriquecidas
      .map(
        (v) => `
        <tr>
          <td>${v.numero_venda || v.id}</td>
          <td>${v.cliente_nome || ""}</td>
          <td>${v.destino_nome || ""}</td>
          <td>${v.produto_nome || ""}</td>
          <td>${v.data_lancamento?.slice(0, 10) || ""}</td>
          <td>${v.status || ""}</td>
          <td>${(v.valor_total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
        </tr>`
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
                <th>Nº Venda</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Produto</th>
                <th>Lançamento</th>
                <th>Status</th>
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

          <div className="form-group">
            <label className="form-label">Destino</label>
            <input
              className="form-input"
              value={destinoBusca}
              onChange={(e) => {
                setDestinoBusca(e.target.value);
                setDestinoSelecionado(null);
              }}
              placeholder="Nome do destino..."
            />
            {destinoBusca && !destinoSelecionado && (
              <div className="card-base" style={{ marginTop: 4, maxHeight: 180, overflowY: "auto" }}>
                {destinosFiltrados.length === 0 && (
                  <div style={{ fontSize: "0.85rem" }}>Nenhum destino encontrado.</div>
                )}
                {destinosFiltrados.map((d) => (
                  <div
                    key={d.id}
                    style={{ padding: "4px 6px", cursor: "pointer" }}
                    onClick={() => {
                      setDestinoSelecionado(d);
                      setDestinoBusca(d.nome);
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{d.nome}</div>
                  </div>
                ))}
              </div>
            )}
            {destinoSelecionado && (
              <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Selecionado: <strong>{destinoSelecionado.nome}</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Produto</label>
            <input
              className="form-input"
              value={produtoBusca}
              onChange={(e) => {
                setProdutoBusca(e.target.value);
                setProdutoSelecionado(null);
              }}
              placeholder="Nome ou tipo..."
            />
            {produtoBusca && !produtoSelecionado && (
              <div className="card-base" style={{ marginTop: 4, maxHeight: 180, overflowY: "auto" }}>
                {produtosFiltrados.length === 0 && (
                  <div style={{ fontSize: "0.85rem" }}>Nenhum produto encontrado.</div>
                )}
                {produtosFiltrados.map((p) => (
                  <div
                    key={p.id}
                    style={{ padding: "4px 6px", cursor: "pointer" }}
                    onClick={() => {
                      setProdutoSelecionado(p);
                      setProdutoBusca(p.nome || p.tipo);
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{p.nome || "(sem nome)"}</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{p.tipo}</div>
                  </div>
                ))}
              </div>
            )}
            {produtoSelecionado && (
              <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Selecionado:{" "}
                <strong>{produtoSelecionado.nome || produtoSelecionado.tipo}</strong>
              </div>
            )}
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
              <strong>{totalVendas}</strong> venda(s) encontrada(s)
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
        <table className="table-default table-header-purple min-w-[1000px]">
          <thead>
            <tr>
              <th>Nº Venda</th>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Destino</th>
              <th>Produto</th>
              <th>Data lançamento</th>
              <th>Data embarque</th>
              <th>Status</th>
              <th>Valor total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9}>Carregando vendas...</td>
              </tr>
            )}

            {!loading && vendasEnriquecidas.length === 0 && (
              <tr>
                <td colSpan={9}>Nenhuma venda encontrada com os filtros atuais.</td>
              </tr>
            )}

            {!loading &&
              vendasEnriquecidas.map((v) => (
                <tr key={v.id}>
                  <td>{v.numero_venda || "-"}</td>
                  <td>{v.cliente_nome}</td>
                  <td>{v.cliente_cpf}</td>
                  <td>{v.destino_nome}</td>
                  <td>{v.produto_nome}</td>
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
                  <td>{v.status || "-"}</td>
                  <td>
                    {v.valor_total != null
                      ? v.valor_total.toLocaleString("pt-BR", {
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
