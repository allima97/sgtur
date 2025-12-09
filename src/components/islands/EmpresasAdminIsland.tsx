import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type EmpresaRow = {
  id: string;
  nome_empresa: string;
  nome_fantasia: string;
  cnpj: string;
  cidade: string | null;
  estado: string | null;

  billing?: {
    status: string;
    valor_mensal: number | null;
    ultimo_pagamento: string | null;
    proximo_vencimento: string | null;
  } | null;
};

const statusColors: Record<string, string> = {
  active: "#22c55e",
  trial: "#0ea5e9",
  past_due: "#eab308",
  suspended: "#f97316",
  canceled: "#ef4444",
};

const EmpresasAdminIsland: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  async function carregarEmpresas() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("companies")
        .select(
          `
          id,
          nome_empresa,
          nome_fantasia,
          cnpj,
          cidade,
          estado,
          billing:company_billing (
            status,
            valor_mensal,
            ultimo_pagamento,
            proximo_vencimento
          )
        `
        )
        .order("nome_fantasia", { ascending: true });

      if (error) throw error;

      setEmpresas(data as EmpresaRow[]);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar lista de empresas.");
    } finally {
      setLoading(false);
    }
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    try {
      const { error } = await supabase
        .from("company_billing")
        .update({ status: novoStatus })
        .eq("company_id", id);

      if (error) throw error;

      await carregarEmpresas();
    } catch (e: any) {
      alert("Erro ao atualizar status.");
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ fontSize: "1.4rem", marginBottom: 15 }}>🏢 Empresas Cadastradas</h3>

      {erro && (
        <div style={{ background: "#7f1d1d", padding: 10, borderRadius: 8 }}>
          {erro}
        </div>
      )}

      {loading ? (
        <p>Carregando empresas...</p>
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
                <th className="th">Nome Fantasia</th>
                <th className="th">CNPJ</th>
                <th className="th">Cidade/Estado</th>
                <th className="th">Status</th>
                <th className="th">Ult. Pagamento</th>
                <th className="th">Próx. Vencimento</th>
                <th className="th">Valor</th>
                <th className="th">Ações</th>
              </tr>
            </thead>

            <tbody>
              {empresas.map((e) => (
                <tr key={e.id} className="tr">
                  <td className="td">{e.nome_fantasia}</td>
                  <td className="td">{e.cnpj}</td>
                  <td className="td">
                    {e.cidade}/{e.estado}
                  </td>

                  <td className="td">
                    <span
                      style={{
                        color: statusColors[e?.billing?.status || "canceled"],
                        fontWeight: "bold",
                        textTransform: "capitalize",
                      }}
                    >
                      {e.billing?.status || "—"}
                    </span>
                  </td>

                  <td className="td">
                    {e.billing?.ultimo_pagamento
                      ? new Date(e.billing.ultimo_pagamento).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="td">
                    {e.billing?.proximo_vencimento
                      ? new Date(e.billing.proximo_vencimento).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="td">
                    {e.billing?.valor_mensal
                      ? `R$ ${e.billing.valor_mensal.toFixed(2)}`
                      : "—"}
                  </td>

                  <td className="td">
                    <button
                      className="btn-small"
                      onClick={() => atualizarStatus(e.id, "active")}
                    >
                      Ativar
                    </button>

                    <button
                      className="btn-small"
                      onClick={() => atualizarStatus(e.id, "past_due")}
                    >
                      Atraso
                    </button>

                    <button
                      className="btn-small"
                      onClick={() => atualizarStatus(e.id, "suspended")}
                    >
                      Suspender
                    </button>

                    <button
                      className="btn-small red"
                      onClick={() => atualizarStatus(e.id, "canceled")}
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

      {/* CSS INLINE SIMPLES PARA FUNCIONAR AGORA */}
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
        .btn-small:hover {
          opacity: 0.85;
        }
        .btn-small.red {
          background: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default EmpresasAdminIsland;
