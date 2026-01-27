import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";
import { exportTableToPDF } from "../../lib/pdf";
import { formatarDataParaExibicao } from "../../lib/formatDate";
import { normalizeText } from "../../lib/normalizeText";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
};

type Venda = {
  id: string;
  vendedor_id: string;
  cliente_id: string;
  destino_id: string;
  produto_id: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  valor_total: number | null;
  status: string | null;
  vendas_recibos?: { valor_total: number | null; valor_taxas: number | null }[];
};

type StatusFiltro = "todos" | "aberto" | "confirmado" | "cancelado";

type LinhaCliente = {
  cliente_id: string;
  cliente_nome: string;
  cliente_cpf: string;
  quantidade: number;
  total: number;
  ticketMedio: number;
};

type Ordenacao = "total" | "quantidade" | "ticket";

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

export default function RelatorioAgrupadoClienteIsland() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const hoje = new Date();
    const inicio = addDays(hoje, -30);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = useState<string>(hojeISO());
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [buscaCliente, setBuscaCliente] = useState("");

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [exportFlags, setExportFlags] = useState<ExportFlags>({
    pdf: true,
    excel: true,
  });
  const [showExport, setShowExport] = useState(false);
  const [exportTipo, setExportTipo] = useState<"csv" | "excel" | "pdf">("csv");
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

  const [ordenacao, setOrdenacao] = useState<Ordenacao>("total");
  const [ordemDesc, setOrdemDesc] = useState<boolean>(true);

  useEffect(() => {
    if (exportTipo === "excel" && !exportFlags.excel) {
      setExportTipo("csv");
      return;
    }
    if (exportTipo === "pdf" && !exportFlags.pdf) {
      setExportTipo("csv");
    }
  }, [exportFlags, exportTipo]);

  useEffect(() => {
    async function carregarBase() {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("id, nome, cpf")
          .order("nome", { ascending: true });

        if (error) throw error;
        setClientes((data || []) as Cliente[]);
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar clientes.");
      }
    }

    carregarBase();
  }, []);

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

  const linhas: LinhaCliente[] = useMemo(() => {
    const cliMap = new Map(clientes.map((c) => [c.id, c]));
    const map = new Map<string, LinhaCliente>();

    vendas.forEach((v) => {
      const key = v.cliente_id;
      const base = cliMap.get(key);
      const nome = base?.nome || "(sem cliente)";
      const cpf = base?.cpf || "";
      const atual =
        map.get(key) ||
        {
          cliente_id: key,
          cliente_nome: nome,
          cliente_cpf: cpf,
          quantidade: 0,
          total: 0,
          ticketMedio: 0,
        };

      const valRecibos = (v.vendas_recibos || []).reduce(
        (acc, r) => acc + Number(r.valor_total || 0),
        0
      );
      const val = valRecibos > 0 ? valRecibos : v.valor_total ?? 0;
      atual.quantidade += 1;
      atual.total += val;
      map.set(key, atual);
    });

    const arr = Array.from(map.values()).map((l) => ({
      ...l,
      ticketMedio: l.quantidade > 0 ? l.total / l.quantidade : 0,
    }));

    arr.sort((a, b) => {
      let comp = 0;
      if (ordenacao === "total") {
        comp = a.total - b.total;
      } else if (ordenacao === "quantidade") {
        comp = a.quantidade - b.quantidade;
      } else {
        comp = a.ticketMedio - b.ticketMedio;
      }
      return ordemDesc ? -comp : comp;
    });

    return arr;
  }, [vendas, clientes, ordenacao, ordemDesc]);

  const linhasFiltradas = useMemo(() => {
    const term = normalizeText(buscaCliente.trim());
    if (!term) return linhas;
    const termDigits = term.replace(/\D/g, "");
    return linhas.filter((l) => {
      if (normalizeText(l.cliente_nome).includes(term)) return true;
      const cpfRaw = l.cliente_cpf || "";
      if (normalizeText(cpfRaw).includes(term)) return true;
      if (termDigits) {
        const cpfDigits = cpfRaw.replace(/\D/g, "");
        return cpfDigits.includes(termDigits);
      }
      return false;
    });
  }, [linhas, buscaCliente]);
  const linhasExibidas = useMemo(() => {
    return linhasFiltradas.slice(0, 5);
  }, [linhasFiltradas]);

  const totalGeral = linhasFiltradas.reduce((acc, l) => acc + l.total, 0);
  const totalQtd = linhasFiltradas.reduce((acc, l) => acc + l.quantidade, 0);
  const ticketGeral = totalQtd > 0 ? totalGeral / totalQtd : 0;

  function aplicarPeriodoPreset(
    tipo: "hoje" | "7" | "30" | "mes_atual" | "mes_anterior" | "limpar"
  ) {
    const hoje = new Date();
    if (tipo === "hoje") {
      setDataInicio(hojeISO());
      setDataFim(hojeISO());
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
    if (tipo === "limpar") {
      setDataInicio("");
      setDataFim("");
    }
  }

  async function carregar() {
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
          cliente_id,
          destino_id,
          produto_id,
          data_lancamento,
          data_embarque,
          valor_total,
          status,
          vendas_recibos (valor_total, valor_taxas)
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

      const { data, error } = await query;
      if (error) throw error;
      setVendas((data || []) as Venda[]);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar vendas para relatório por cliente.");
    } finally {
      setLoading(false);
    }
  }

  function mudarOrdenacao(campo: Ordenacao) {
    if (campo === ordenacao) {
      setOrdemDesc((prev) => !prev);
    } else {
      setOrdenacao(campo);
      setOrdemDesc(true);
    }
  }

  useEffect(() => {
    if (userCtx) {
      carregar();
    }
  }, [userCtx]);

  function exportarCSV() {
    if (linhasFiltradas.length === 0) {
      showToast("Não há dados para exportar.", "warning");
      return;
    }

    const header = ["cliente", "cpf", "quantidade", "total", "ticket_medio"];
    const rows = linhasFiltradas.map((l) => [
      l.cliente_nome,
      l.cliente_cpf,
      l.quantidade.toString(),
      l.total.toFixed(2).replace(".", ","),
      l.ticketMedio.toFixed(2).replace(".", ","),
    ]);
    const all = [header, ...rows]
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
    link.setAttribute("download", `relatorio-vendas-por-cliente-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportarExcel() {
    if (!exportFlags.excel) {
      showToast("Exportação Excel desabilitada nos parâmetros.", "warning");
      return;
    }
    if (linhasFiltradas.length === 0) {
      showToast("Não há dados para exportar.", "warning");
      return;
    }

    const data = linhasFiltradas.map((l) => ({
      Cliente: l.cliente_nome,
      CPF: l.cliente_cpf,
      Quantidade: l.quantidade,
      "Faturamento (R$)": l.total,
      "Ticket médio (R$)": l.ticketMedio,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas por Cliente");

    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
    XLSX.writeFile(wb, `relatorio-clientes-${ts}.xlsx`);
  }

  function exportarPDF() {
    if (!exportFlags.pdf) {
      showToast("Exportação PDF desabilitada nos parâmetros.", "warning");
      return;
    }
    if (linhasFiltradas.length === 0) {
      showToast("Não há dados para exportar.", "warning");
      return;
    }

    const subtitle =
      dataInicio && dataFim
        ? `Período: ${formatarDataParaExibicao(dataInicio)} até ${formatarDataParaExibicao(
            dataFim
          )}`
        : dataInicio
        ? `A partir de ${formatarDataParaExibicao(dataInicio)}`
        : dataFim
        ? `Até ${formatarDataParaExibicao(dataFim)}`
        : undefined;

    const headers = ["Cliente", "CPF", "Qtde", "Faturamento", "Ticket médio"];
    const rows = linhasFiltradas.map((l) => [
      l.cliente_nome,
      l.cliente_cpf,
      l.quantidade,
      l.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      l.ticketMedio.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    ]);

    exportTableToPDF({
      title: "Vendas por Cliente",
      subtitle,
      headers,
      rows,
      fileName: "relatorio-vendas-por-cliente",
      orientation: "landscape",
    });
  }

  function exportarSelecionado() {
    if (exportTipo === "csv") {
      exportarCSV();
      return;
    }
    if (exportTipo === "excel") {
      exportarExcel();
      return;
    }
    exportarPDF();
  }

  const exportDisabled =
    (exportTipo === "excel" && !exportFlags.excel) ||
    (exportTipo === "pdf" && !exportFlags.pdf);

  return (
    <div className="relatorio-vendas-cliente-page">
      <div className="card-base card-purple form-card mb-3">
        <div className="flex flex-col gap-2 sm:hidden">
          <div className="form-group">
            <label className="form-label">Buscar cliente ou CPF</label>
            <input
              className="form-input"
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              placeholder="Nome do cliente ou CPF..."
            />
          </div>
          <button type="button" className="btn btn-light" onClick={() => setShowExport(true)}>
            Exportar
          </button>
        </div>
        <div className="hidden sm:block">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data início</label>
              <input
                type="date"
                className="form-input"
                value={dataInicio}
                onChange={(e) => {
                  const nextInicio = e.target.value;
                  setDataInicio(nextInicio);
                  if (dataFim && nextInicio && dataFim < nextInicio) {
                    setDataFim(nextInicio);
                  }
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data fim</label>
              <input
                type="date"
                className="form-input"
                value={dataFim}
                min={dataInicio || undefined}
                onChange={(e) => {
                  const nextFim = e.target.value;
                  const boundedFim =
                    dataInicio && nextFim && nextFim < dataInicio ? dataInicio : nextFim;
                  setDataFim(boundedFim);
                }}
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
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
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

            <button type="button" className="btn btn-primary" onClick={carregar}>
              Aplicar filtros
            </button>

            <button type="button" className="btn btn-purple" onClick={exportarCSV}>
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


      {showExport && (
        <div className="mobile-drawer-backdrop" onClick={() => setShowExport(false)}>
          <div
            className="mobile-drawer-panel"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong>Exportar</strong>
              <button type="button" className="btn-ghost" onClick={() => setShowExport(false)}>
                ✕
              </button>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Formato</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`btn ${exportTipo === "csv" ? "btn-primary" : "btn-light"}`}
                  onClick={() => setExportTipo("csv")}
                >
                  CSV
                </button>
                <button
                  type="button"
                  className={`btn ${exportTipo === "excel" ? "btn-primary" : "btn-light"}`}
                  onClick={() => setExportTipo("excel")}
                  disabled={!exportFlags.excel}
                  title={
                    !exportFlags.excel ? "Exportação Excel desabilitada nos parâmetros" : ""
                  }
                >
                  Excel
                </button>
                <button
                  type="button"
                  className={`btn ${exportTipo === "pdf" ? "btn-primary" : "btn-light"}`}
                  onClick={() => setExportTipo("pdf")}
                  disabled={!exportFlags.pdf}
                  title={!exportFlags.pdf ? "Exportação PDF desabilitada nos parâmetros" : ""}
                >
                  PDF
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 12, width: "100%" }}
              onClick={() => {
                exportarSelecionado();
                setShowExport(false);
              }}
              disabled={exportDisabled}
            >
              Exportar
            </button>
          </div>
        </div>
      )}

      {loadingUser && (
        <div className="card-base card-config mb-3">Carregando contexto do usuário...</div>
      )}
      {userCtx && userCtx.papel !== "ADMIN" && (
        <div className="card-base card-config mb-3" style={{ color: "#334155" }}>
          Relatório limitado a {userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas"}.
        </div>
      )}

      {erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <span>
              Clientes: <strong>{linhasFiltradas.length}</strong>
            </span>
          </div>
          <div className="form-group">
            <span>
              Faturamento total:{" "}
              <strong>
                {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
            </span>
          </div>
          <div className="form-group">
            <span>
              Ticket médio geral:{" "}
              <strong>
                {ticketGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-purple table-mobile-cards min-w-[700px]">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>CPF</th>
              <th style={{ cursor: "pointer" }} onClick={() => mudarOrdenacao("quantidade")}>
                Qtde {ordenacao === "quantidade" ? (ordemDesc ? "↓" : "↑") : ""}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => mudarOrdenacao("total")}>
                Faturamento {ordenacao === "total" ? (ordemDesc ? "↓" : "↑") : ""}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => mudarOrdenacao("ticket")}>
                Ticket médio {ordenacao === "ticket" ? (ordemDesc ? "↓" : "↑") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5}>Carregando...</td>
              </tr>
            )}
            {!loading && linhasExibidas.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum cliente encontrado com os filtros atuais.</td>
              </tr>
            )}
            {!loading &&
              linhasExibidas.map((l) => (
                <tr key={l.cliente_id}>
                  <td data-label="Cliente">{l.cliente_nome}</td>
                  <td data-label="CPF">{l.cliente_cpf}</td>
                  <td data-label="Qtde">{l.quantidade}</td>
                  <td data-label="Faturamento">
                    {l.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td data-label="Ticket médio">
                    {l.ticketMedio.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

