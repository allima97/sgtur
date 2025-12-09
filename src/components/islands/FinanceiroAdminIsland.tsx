import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type BillingRow = {
  id: string;
  company_id: string;
  status: string;
  valor_mensal: number | null;
  ultimo_pagamento: string | null;
  proximo_vencimento: string | null;
  companies?: {
    nome_fantasia: string;
    cnpj: string;
  } | null;
};

const statusLabels: Record<string, string> = {
  active: "Ativa",
  trial: "Trial",
  past_due: "Atrasada",
  suspended: "Suspensa",
  canceled: "Cancelada",
};

const statusColors: Record<string, string> = {
  active: "#22c55e",
  trial: "#0ea5e9",
  past_due: "#eab308",
  suspended: "#f97316",
  canceled: "#ef4444",
};

const FinanceiroAdminIsland: React.FC = () => {
  const [registros, setRegistros] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarFinanceiro();
  }, []);

  async function carregarFinanceiro() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("company_billing")
        .select(`
          id,
          company_id,
          status,
          valor_mensal,
          ultimo_pagamento,
          proximo_vencimento,
          companies (nome_fantasia, cnpj)
        `)
        .order("proximo_vencimento", { ascending: true });

      if (error) throw error;

      setRegistros(data as BillingRow[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar registros financeiros.");
    } finally {
      setLoading(false);
    }
  }

  async function atualizarStatus(company_id: string, status: string) {
    try {
      const { error } = await supabase
        .from("company_billing")
        .update({ status })
        .eq("company_id", company_id);

      if (error) throw error;
      await carregarFinanceiro();
    } catch {
      alert("Erro ao atualizar status financeiro.");
    }
  }

  function formatarData(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  }

  function formatarValor(v: number | null) {
    if (!v) return "—";
    return `R$ ${v.toFixed(2)}`;
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ fontSize: "1.4rem", marginBottom: 15 }}>
        💳 Controle Financeiro (Billing)
      </h3>

      {erro && (
        <div style={{ background: "#7f1d1d", padding: 10, borderRadius: 8 }}>
          {erro}
        </div>
      )}

      {loading ? (
        <p>Carregando financeiro...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#0f172a",
              color: "#e2e8f0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#1e293b" }}>
                <th className="th">Empresa</th>
                <th className="th">CNPJ</th>
                <th className="th">Status</th>
                <th className="th">Último Pagamento</th>
                <th className="th">Próx. Vencimento</th>
                <th className="th">Valor do Plano</th>
                <th className="th">Ações</th>
              </tr>
            </thead>

            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="tr">
                  <td className="td">{r.companies?.nome_fantasia || "—"}</td>
                  <td className="td">{r.companies?.cnpj || "—"}</td>

                  <td className="td">
                    <span
                      style={{
                        color: statusColors[r.status],
                        fontWeight: "bold",
                        textTransform: "capitalize",
                      }}
                    >
                      {statusLabels[r.status]}
                    </span>
                  </td>

                  <td className="td">{formatarData(r.ultimo_pagamento)}</td>
                  <td className="td">{formatarData(r.proximo_vencimento)}</td>
                  <td className="td">{formatarValor(r.valor_mensal)}</td>

                  <td className="td">
                    <button
                      className="btn-small"
                      onClick={() => atualizarStatus(r.company_id, "active")}
                    >
                      Ativar
                    </button>

                    <button
                      className="btn-small"
                      onClick={() => atualizarStatus(r.company_id, "past_due")}
                    >
                      Atrasada
                    </button>

                    <button
                      className="btn-small"
                      onClick={() => atualizarStatus(r.company_id, "suspended")}
                    >
                      Suspender
                    </button>

                    <button
                      className="btn-small red"
                      onClick={() => atualizarStatus(r.company_id, "canceled")}
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .th {
          padding: 10px;
          font-size: 0.85rem;
          text-align: left;
          border-bottom: 1px solid #334155;
        }
        .td {
          padding: 10px;
          font-size: 0.85rem;
          border-bottom: 1px solid #1e293b;
        }
        .tr:hover {
          background: #1e293b;
        }
        .btn-small {
          margin-right: 6px;
          padding: 4px 7px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          background: #334155;
          color: #e2e8f0;
        }
        .btn-small.red {
          background: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default FinanceiroAdminIsland;
