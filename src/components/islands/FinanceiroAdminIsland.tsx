import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

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
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

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
      showToast("Erro ao atualizar status financeiro.", "error");
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
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">💳 Controle Financeiro (Billing)</h3>

      {erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {loading ? (
        <p>Carregando financeiro...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-slate-900 text-slate-200 rounded-xl overflow-hidden border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Empresa</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">CNPJ</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Status</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Último Pagamento</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Próx. Vencimento</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Valor do Plano</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Ações</th>
              </tr>
            </thead>

            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800">
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{r.companies?.nome_fantasia || "—"}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{r.companies?.cnpj || "—"}</td>

                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    <span
                      className="font-bold capitalize"
                      style={{ color: statusColors[r.status] }}
                    >
                      {statusLabels[r.status]}
                    </span>
                  </td>

                  <td className="px-4 py-2 text-sm border-b border-slate-800">{formatarData(r.ultimo_pagamento)}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{formatarData(r.proximo_vencimento)}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{formatarValor(r.valor_mensal)}</td>

                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    <button
                      className="px-2 py-1 rounded bg-slate-700 text-slate-100 hover:opacity-85 transition mr-1"
                      onClick={() => atualizarStatus(r.company_id, "active")}
                    >
                      Ativar
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-yellow-600 text-slate-100 hover:opacity-85 transition mr-1"
                      onClick={() => atualizarStatus(r.company_id, "past_due")}
                    >
                      Atrasada
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-orange-600 text-slate-100 hover:opacity-85 transition mr-1"
                      onClick={() => atualizarStatus(r.company_id, "suspended")}
                    >
                      Suspender
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-rose-600 text-slate-100 hover:opacity-85 transition"
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
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default FinanceiroAdminIsland;
