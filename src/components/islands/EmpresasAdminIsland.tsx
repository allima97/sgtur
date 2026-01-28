import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

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
    plan?: { nome: string } | null;
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
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

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
            ,plan:plans (nome)
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
      showToast("Erro ao atualizar status.", "error");
    }
  }

  return (
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">🏢 Empresas Cadastradas</h3>

      {erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {loading ? (
        <p>Carregando empresas...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-slate-900 text-slate-200 rounded-xl overflow-hidden border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Nome Fantasia</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">CNPJ</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Cidade/Estado</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Plano</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Status</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Ult. Pagamento</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Próx. Vencimento</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Valor</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Ações</th>
              </tr>
            </thead>

            <tbody>
              {empresas.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800">
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{e.nome_fantasia}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{e.cnpj}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{e.cidade}/{e.estado}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    {e.billing?.plan?.nome || "—"}
                  </td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    <span
                      className="font-bold capitalize"
                      style={{ color: statusColors[e?.billing?.status || "canceled"] }}
                    >
                      {e.billing?.status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    {e.billing?.ultimo_pagamento
                      ? new Date(e.billing.ultimo_pagamento).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    {e.billing?.proximo_vencimento
                      ? new Date(e.billing.proximo_vencimento).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    {e.billing?.valor_mensal
                      ? `R$ ${e.billing.valor_mensal.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    <button
                      className="px-2 py-1 rounded bg-slate-700 text-slate-100 hover:opacity-85 transition mr-1"
                      onClick={() => atualizarStatus(e.id, "active")}
                    >
                      Ativar
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-yellow-600 text-slate-100 hover:opacity-85 transition mr-1"
                      onClick={() => atualizarStatus(e.id, "past_due")}
                    >
                      Atraso
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-orange-600 text-slate-100 hover:opacity-85 transition mr-1"
                      onClick={() => atualizarStatus(e.id, "suspended")}
                    >
                      Suspender
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-rose-600 text-slate-100 hover:opacity-85 transition"
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
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default EmpresasAdminIsland;
