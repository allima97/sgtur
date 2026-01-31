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

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

const EmpresasAdminIsland: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [novoCadastro, setNovoCadastro] = useState({
    nome_empresa: "",
    nome_fantasia: "",
    cnpj: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
  });
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
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

  function abrirModalNovaEmpresa() {
    setNovoCadastro({
      nome_empresa: "",
      nome_fantasia: "",
      cnpj: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
    });
    setErroCadastro(null);
    setCreateModalOpen(true);
  }

  async function salvarEmpresa() {
    const nomeEmpresa = novoCadastro.nome_empresa.trim();
    const cnpjLimpo = novoCadastro.cnpj.replace(/\D/g, "");
    if (!nomeEmpresa) {
      setErroCadastro("Informe o nome da empresa.");
      return;
    }
    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      setErroCadastro("Informe um CNPJ válido.");
      return;
    }
    try {
      setSalvandoEmpresa(true);
      setErroCadastro(null);
      const payload = {
        nome_empresa: nomeEmpresa,
        nome_fantasia: novoCadastro.nome_fantasia.trim() || nomeEmpresa,
        cnpj: cnpjLimpo,
        telefone: novoCadastro.telefone.trim() || null,
        endereco: novoCadastro.endereco.trim() || null,
        cidade: novoCadastro.cidade.trim() || null,
        estado: novoCadastro.estado.trim().toUpperCase().slice(0, 2) || null,
      };
      const { error } = await supabase.from("companies").insert(payload).select("id").single();
      if (error) throw error;
      showToast("Empresa cadastrada com sucesso!", "success");
      setCreateModalOpen(false);
      setNovoCadastro({
        nome_empresa: "",
        nome_fantasia: "",
        cnpj: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
      });
      await carregarEmpresas();
    } catch (e: any) {
      console.error(e);
      setErroCadastro("Erro ao cadastrar empresa.");
    } finally {
      setSalvandoEmpresa(false);
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
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <h3 className="text-xl font-semibold">🏢 Empresas Cadastradas</h3>
        <button className="btn btn-primary" onClick={abrirModalNovaEmpresa}>
          Nova empresa
        </button>
      </div>

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

      {createModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form
            className="modal-panel"
            style={{ maxWidth: 720, width: "95vw", background: "#f8fafc" }}
            onSubmit={(e) => {
              e.preventDefault();
              salvarEmpresa();
            }}
          >
            <div className="modal-header">
              <div className="modal-title" style={{ color: "#1d4ed8", fontWeight: 800 }}>
                Cadastro de empresa
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCreateModalOpen(false)}
                disabled={salvandoEmpresa}
              >
                âœ–
              </button>
            </div>

            <div className="modal-body">
              {erroCadastro && (
                <div className="mb-3">
                  <AlertMessage variant="error">{erroCadastro}</AlertMessage>
                </div>
              )}

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Nome da empresa</label>
                  <input
                    className="form-input"
                    value={novoCadastro.nome_empresa}
                    onChange={(e) => {
                      setNovoCadastro((prev) => ({ ...prev, nome_empresa: e.target.value }));
                      setErroCadastro(null);
                    }}
                    placeholder="RazÃ£o social"
                    disabled={salvandoEmpresa}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Nome fantasia</label>
                  <input
                    className="form-input"
                    value={novoCadastro.nome_fantasia}
                    onChange={(e) => {
                      setNovoCadastro((prev) => ({ ...prev, nome_fantasia: e.target.value }));
                      setErroCadastro(null);
                    }}
                    placeholder="Nome fantasia"
                    disabled={salvandoEmpresa}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">CNPJ</label>
                  <input
                    className="form-input"
                    value={formatCnpj(novoCadastro.cnpj)}
                    onChange={(e) => {
                      setNovoCadastro((prev) => ({ ...prev, cnpj: formatCnpj(e.target.value) }));
                      setErroCadastro(null);
                    }}
                    placeholder="00.000.000/0000-00"
                    disabled={salvandoEmpresa}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Telefone</label>
                  <input
                    className="form-input"
                    value={novoCadastro.telefone}
                    onChange={(e) => {
                      setNovoCadastro((prev) => ({ ...prev, telefone: e.target.value }));
                      setErroCadastro(null);
                    }}
                    placeholder="(00) 00000-0000"
                    disabled={salvandoEmpresa}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">EndereÃ§o</label>
                <input
                  className="form-input"
                  value={novoCadastro.endereco}
                  onChange={(e) => {
                    setNovoCadastro((prev) => ({ ...prev, endereco: e.target.value }));
                    setErroCadastro(null);
                  }}
                  placeholder="Rua, nÃºmero, complemento"
                  disabled={salvandoEmpresa}
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Cidade</label>
                  <input
                    className="form-input"
                    value={novoCadastro.cidade}
                    onChange={(e) => {
                      setNovoCadastro((prev) => ({ ...prev, cidade: e.target.value }));
                      setErroCadastro(null);
                    }}
                    disabled={salvandoEmpresa}
                  />
                </div>
                <div className="form-group" style={{ maxWidth: 120 }}>
                  <label className="form-label">Estado</label>
                  <input
                    className="form-input"
                    value={novoCadastro.estado}
                    onChange={(e) => {
                      setNovoCadastro((prev) => ({ ...prev, estado: e.target.value }));
                      setErroCadastro(null);
                    }}
                    maxLength={2}
                    placeholder="UF"
                    disabled={salvandoEmpresa}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer mobile-stack-buttons">
              <button type="submit" className="btn btn-primary" disabled={salvandoEmpresa}>
                {salvandoEmpresa ? "Salvando..." : "Salvar empresa"}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setCreateModalOpen(false)}
                disabled={salvandoEmpresa}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default EmpresasAdminIsland;
