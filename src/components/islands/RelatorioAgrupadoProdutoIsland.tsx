import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Produto = {
  id: string;
  nome: string | null;
  tipo: string;
};

type Venda = {
  id: string;
  cliente_id: string;
  destino_id: string;
  produto_id: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  valor_total: number | null;
  status: string | null;
  vendas_recibos?: { produto_id: string | null; valor_total: number | null; valor_taxas: number | null }[];
};

type StatusFiltro = "todos" | "aberto" | "confirmado" | "cancelado";

type LinhaProduto = {
  produto_id: string | null;
  produto_nome: string;
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

export default function RelatorioAgrupadoProdutoIsland() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const hoje = new Date();
    const inicio = addDays(hoje, -30);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = useState<string>(hojeISO());
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [ordenacao, setOrdenacao] = useState<Ordenacao>("total");
  const [ordemDesc, setOrdemDesc] = useState<boolean>(true);

  useEffect(() => {
    async function carregarBase() {
      try {
        const { data, error } = await supabase
          .from("tipo_produtos")
          .select("id, nome, tipo")
          .order("nome", { ascending: true });

        if (error) throw error;
        setProdutos((data || []) as Produto[]);
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar produtos.");
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
          vendedorIds = [];
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

  const linhas: LinhaProduto[] = useMemo(() => {
    const prodMap = new Map(produtos.map((p) => [p.id, p]));
    const map = new Map<string, LinhaProduto>();

    const adicionar = (prodId: string | null, valor: number) => {
      const key = prodId || "sem-produto";
      const base = prodId ? prodMap.get(prodId) : undefined;
      const nome = base?.nome || base?.tipo || "(sem produto)";
      const atual =
        map.get(key) ||
        {
          produto_id: prodId,
          produto_nome: nome,
          quantidade: 0,
          total: 0,
          ticketMedio: 0,
        };
      atual.quantidade += 1;
      atual.total += valor;
      map.set(key, atual);
    };

    vendas.forEach((v) => {
      const recibos = v.vendas_recibos || [];
      if (recibos.length) {
        recibos.forEach((r) => {
          const val = Number(r.valor_total || 0) + Number(r.valor_taxas || 0);
          adicionar(r.produto_id, val);
        });
      } else {
        const val = v.valor_total ?? 0;
        adicionar(v.produto_id, val);
      }
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
  }, [vendas, produtos, ordenacao, ordemDesc]);

  const totalGeral = linhas.reduce((acc, l) => acc + l.total, 0);
  const totalQtd = linhas.reduce((acc, l) => acc + l.quantidade, 0);
  const ticketGeral = totalQtd > 0 ? totalGeral / totalQtd : 0;

  function aplicarPeriodoPreset(tipo: "7" | "30" | "mes_atual" | "mes_anterior") {
    const hoje = new Date();
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
          vendas_recibos (produto_id, valor_total, valor_taxas)
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
      setErro("Erro ao carregar vendas para relatório por produto.");
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
    if (linhas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const header = ["produto", "quantidade", "total", "ticket_medio"];

    const rows = linhas.map((l) => [
      l.produto_nome,
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
    link.setAttribute("download", `relatorio-vendas-por-produto-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relatorio-vendas-produto-page">
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
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
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

          <button type="button" className="btn btn-primary" onClick={carregar}>
            Aplicar filtros
          </button>

          <button type="button" className="btn btn-purple" onClick={exportarCSV}>
            Exportar CSV
          </button>
        </div>
      </div>

      {loadingUser && (
        <div className="card-base card-config mb-3">Carregando contexto do usuário...</div>
      )}
      {userCtx && userCtx.papel !== "ADMIN" && (
        <div className="card-base card-config mb-3" style={{ color: "#334155" }}>
          Relatório limitado a {userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas"}.
        </div>
      )}

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <span>
              Produtos: <strong>{linhas.length}</strong>
            </span>
          </div>
          <div className="form-group">
            <span>
              Faturamento total:{" "}
              <strong>
                {totalGeral.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </span>
          </div>
          <div className="form-group">
            <span>
              Ticket médio geral:{" "}
              <strong>
                {ticketGeral.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-purple min-w-[620px]">
          <thead>
            <tr>
              <th>Produto</th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => mudarOrdenacao("quantidade")}
              >
                Qtde {ordenacao === "quantidade" ? (ordemDesc ? "↓" : "↑") : ""}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => mudarOrdenacao("total")}
              >
                Faturamento {ordenacao === "total" ? (ordemDesc ? "↓" : "↑") : ""}
              </th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => mudarOrdenacao("ticket")}
              >
                Ticket médio {ordenacao === "ticket" ? (ordemDesc ? "↓" : "↑") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4}>Carregando...</td>
              </tr>
            )}
            {!loading && linhas.length === 0 && (
              <tr>
                <td colSpan={4}>
                  Nenhum produto encontrado com os filtros atuais.
                </td>
              </tr>
            )}
            {!loading &&
              linhas.map((l, idx) => (
                <tr key={l.produto_id ?? `sem-${idx}`}>
                  <td>{l.produto_nome}</td>
                  <td>{l.quantidade}</td>
                  <td>
                    {l.total.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td>
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
    </div>
  );
}
