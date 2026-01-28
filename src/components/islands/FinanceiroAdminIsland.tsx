import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

type PlanoRow = {
  id: string;
  nome: string;
  valor_mensal: number;
  moeda: string;
  ativo: boolean;
};

type BillingRow = {
  id: string;
  company_id: string;
  plan_id: string | null;
  status: string;
  valor_mensal: number | null;
  ultimo_pagamento: string | null;
  proximo_vencimento: string | null;
  companies?: {
    nome_fantasia: string;
    cnpj: string;
  } | null;
  plan?: PlanoRow | null;
};

type BillingEvent = {
  id: string;
  tipo: string;
  status: string;
  valor: number | null;
  moeda: string;
  referencia: string | null;
  vencimento: string | null;
  pago_em: string | null;
  created_at: string;
};

type BillingForm = {
  plan_id: string;
  status: string;
  valor_mensal: string;
  ultimo_pagamento: string;
  proximo_vencimento: string;
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

const defaultForm: BillingForm = {
  plan_id: "",
  status: "trial",
  valor_mensal: "",
  ultimo_pagamento: "",
  proximo_vencimento: "",
};

function formatarData(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatarValor(v: number | null) {
  if (!v && v !== 0) return "—";
  return `R$ ${v.toFixed(2)}`;
}

function toDateInput(d: string | null) {
  if (!d) return "";
  return d.slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() < day) {
    result.setDate(0);
  }
  return result;
}

const FinanceiroAdminIsland: React.FC = () => {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("AdminFinanceiro") || can("AdminDashboard") || can("Admin");

  const [registros, setRegistros] = useState<BillingRow[]>([]);
  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [eventos, setEventos] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<BillingForm>(defaultForm);
  const [selecionado, setSelecionado] = useState<BillingRow | null>(null);

  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

  const planosAtivos = useMemo(() => planos.filter((p) => p.ativo), [planos]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro(null);

      const [billingRes, plansRes] = await Promise.all([
        supabase
          .from("company_billing")
          .select(
            `
          id,
          company_id,
          plan_id,
          status,
          valor_mensal,
          ultimo_pagamento,
          proximo_vencimento,
          companies (nome_fantasia, cnpj),
          plan:plans (id, nome, valor_mensal, moeda, ativo)
        `
          )
          .order("proximo_vencimento", { ascending: true }),
        supabase
          .from("plans")
          .select("id, nome, valor_mensal, moeda, ativo")
          .order("nome", { ascending: true }),
      ]);

      if (billingRes.error || plansRes.error) {
        throw billingRes.error || plansRes.error;
      }

      setRegistros((billingRes.data as BillingRow[]) || []);
      setPlanos((plansRes.data as PlanoRow[]) || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar registros financeiros.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarEventos(companyId: string) {
    const { data, error } = await supabase
      .from("company_billing_events")
      .select("id, tipo, status, valor, moeda, referencia, vencimento, pago_em, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error(error);
      return;
    }

    setEventos((data as BillingEvent[]) || []);
  }

  function openModal(row: BillingRow) {
    setSelecionado(row);
    setForm({
      plan_id: row.plan_id || "",
      status: row.status || "trial",
      valor_mensal:
        row.valor_mensal != null
          ? row.valor_mensal.toString()
          : row.plan?.valor_mensal?.toString() || "",
      ultimo_pagamento: toDateInput(row.ultimo_pagamento),
      proximo_vencimento: toDateInput(row.proximo_vencimento),
    });
    setEventos([]);
    carregarEventos(row.company_id);
    setModalOpen(true);
  }

  async function inserirEventos(events: Array<Partial<BillingEvent>>) {
    if (!events.length) return;
    const payload = events.map((event) => ({
      company_id: selecionado?.company_id,
      billing_id: selecionado?.id,
      tipo: event.tipo || "update",
      status: event.status || "pending",
      valor: event.valor ?? null,
      moeda: event.moeda || "BRL",
      referencia: event.referencia || null,
      vencimento: event.vencimento || null,
      pago_em: event.pago_em || null,
    }));

    const { error } = await supabase.from("company_billing_events").insert(payload);
    if (error) {
      console.error(error);
      showToast("Não foi possível salvar o histórico financeiro.", "error");
    }
  }

  async function salvarCobranca(e?: React.FormEvent, override?: Partial<BillingForm>) {
    if (e) e.preventDefault();
    if (!selecionado) return;
    setSalvando(true);
    setErro(null);

    try {
      const mergedForm = { ...form, ...(override || {}) };
      const valorNumero = mergedForm.valor_mensal ? Number(mergedForm.valor_mensal) : null;
      const payload = {
        plan_id: mergedForm.plan_id || null,
        status: mergedForm.status,
        valor_mensal: valorNumero != null && Number.isFinite(valorNumero) ? valorNumero : null,
        ultimo_pagamento: mergedForm.ultimo_pagamento || null,
        proximo_vencimento: mergedForm.proximo_vencimento || null,
      };

      const { error } = await supabase
        .from("company_billing")
        .update(payload)
        .eq("id", selecionado.id);

      if (error) throw error;

      const events: Array<Partial<BillingEvent>> = [];

      if (selecionado.plan_id !== payload.plan_id) {
        const planName = planos.find((p) => p.id === payload.plan_id)?.nome || "—";
        events.push({
          tipo: "plan_changed",
          status: payload.status,
          referencia: `Plano: ${planName}`,
        });
      }

      if (selecionado.status !== payload.status) {
        events.push({
          tipo: "status_changed",
          status: payload.status,
          referencia: `Status: ${payload.status}`,
        });
      }

      if (payload.ultimo_pagamento && payload.ultimo_pagamento !== selecionado.ultimo_pagamento) {
        events.push({
          tipo: "payment_registered",
          status: "paid",
          valor: payload.valor_mensal ?? undefined,
          vencimento: payload.proximo_vencimento || undefined,
          pago_em: new Date(payload.ultimo_pagamento).toISOString(),
          referencia: "Pagamento registrado",
        });
      }

      await inserirEventos(events);
      showToast("Cobrança atualizada.", "success");
      setModalOpen(false);
      setSelecionado(null);
      setEventos([]);
      await carregarDados();
    } catch (e) {
      console.error(e);
      setErro("Erro ao atualizar cobrança.");
    } finally {
      setSalvando(false);
    }
  }

  async function registrarPagamentoHoje() {
    if (!selecionado) return;

    const today = new Date();
    const next = addMonths(today, 1);
    const todayStr = today.toISOString().slice(0, 10);
    const nextStr = next.toISOString().slice(0, 10);

    const planValue = planos.find((p) => p.id === form.plan_id)?.valor_mensal;
    const valorNumero = form.valor_mensal ? Number(form.valor_mensal) : planValue ?? null;

    const override: Partial<BillingForm> = {
      status: "active",
      ultimo_pagamento: todayStr,
      proximo_vencimento: nextStr,
      valor_mensal: valorNumero != null ? valorNumero.toString() : "",
    };

    setForm((prev) => ({ ...prev, ...override }));
    await salvarCobranca(undefined, override);
  }

  async function atualizarStatus(row: BillingRow, status: string) {
    try {
      const { error } = await supabase
        .from("company_billing")
        .update({ status })
        .eq("id", row.id);

      if (error) throw error;

      await supabase.from("company_billing_events").insert({
        company_id: row.company_id,
        billing_id: row.id,
        tipo: "status_changed",
        status,
        referencia: `Status: ${status}`,
      });

      await carregarDados();
    } catch (e) {
      console.error(e);
      showToast("Erro ao atualizar status financeiro.", "error");
    }
  }

  if (loadingPerm) return <LoadingUsuarioContext />;

  if (!podeVer) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Apenas administradores podem acessar o financeiro.</h3>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-4">💳 Controle financeiro (billing)</h3>

      {erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {loading ? (
        <p>Carregando financeiro...</p>
      ) : (
        <div className="table-container overflow-x-auto">
          <table className="table-default table-header-red min-w-[860px]">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>CNPJ</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Últ. pagamento</th>
                <th>Próx. vencimento</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8}>Nenhuma cobrança encontrada.</td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id}>
                    <td>{r.companies?.nome_fantasia || "—"}</td>
                    <td>{r.companies?.cnpj || "—"}</td>
                    <td>{r.plan?.nome || "—"}</td>
                    <td>
                      <span className="font-bold capitalize" style={{ color: statusColors[r.status] }}>
                        {statusLabels[r.status] || r.status}
                      </span>
                    </td>
                    <td>{formatarData(r.ultimo_pagamento)}</td>
                    <td>{formatarData(r.proximo_vencimento)}</td>
                    <td>{formatarValor(r.valor_mensal)}</td>
                    <td className="th-actions">
                      <div className="icon-action-group">
                        <button
                          className="icon-action-btn"
                          onClick={() => openModal(r)}
                          title="Editar cobrança"
                          aria-label="Editar cobrança"
                        >
                          ✏️
                        </button>
                        <button
                          className="icon-action-btn"
                          onClick={() => atualizarStatus(r, "active")}
                          title="Ativar cobrança"
                          aria-label="Ativar cobrança"
                          disabled={r.status === "active"}
                          style={{ borderColor: statusColors.active, color: statusColors.active }}
                        >
                          ✅
                        </button>
                        <button
                          className="icon-action-btn"
                          onClick={() => atualizarStatus(r, "past_due")}
                          title="Marcar como atrasada"
                          aria-label="Marcar como atrasada"
                          disabled={r.status === "past_due"}
                          style={{ borderColor: statusColors.past_due, color: statusColors.past_due }}
                        >
                          ⏰
                        </button>
                        <button
                          className="icon-action-btn"
                          onClick={() => atualizarStatus(r, "suspended")}
                          title="Suspender cobrança"
                          aria-label="Suspender cobrança"
                          disabled={r.status === "suspended"}
                          style={{ borderColor: statusColors.suspended, color: statusColors.suspended }}
                        >
                          ⏸️
                        </button>
                        <button
                          className="icon-action-btn danger"
                          onClick={() => atualizarStatus(r, "canceled")}
                          title="Cancelar cobrança"
                          aria-label="Cancelar cobrança"
                          disabled={r.status === "canceled"}
                        >
                          🛑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && selecionado && (
        <div className="fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4">
          <form
            className="card-base card-config w-full max-w-2xl"
            onSubmit={salvarCobranca}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold">
                Cobrança: {selecionado.companies?.nome_fantasia || "Empresa"}
              </h4>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setModalOpen(false)}
                disabled={salvando}
              >
                Fechar
              </button>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">Plano</label>
                <select
                  className="form-select"
                  value={form.plan_id}
                  onChange={(e) => {
                    const nextPlanId = e.target.value;
                    const planValue = planosAtivos.find((p) => p.id === nextPlanId)?.valor_mensal;
                    setForm((prev) => ({
                      ...prev,
                      plan_id: nextPlanId,
                      valor_mensal:
                        prev.valor_mensal || planValue == null ? prev.valor_mensal : planValue.toString(),
                    }));
                  }}
                >
                  <option value="">Sem plano</option>
                  {planosAtivos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.moeda} {p.valor_mensal.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {Object.keys(statusLabels).map((key) => (
                    <option key={key} value={key}>
                      {statusLabels[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Valor mensal</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={form.valor_mensal}
                  onChange={(e) => setForm((prev) => ({ ...prev, valor_mensal: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">Último pagamento</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.ultimo_pagamento}
                  onChange={(e) => setForm((prev) => ({ ...prev, ultimo_pagamento: e.target.value }))}
                />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Próximo vencimento</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.proximo_vencimento}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, proximo_vencimento: e.target.value }))
                  }
                />
              </div>
            </div>

            {eventos.length > 0 && (
              <div className="card-base card-red mt-3">
                <h4 className="font-semibold mb-2">Histórico recente</h4>
                <div className="max-h-48 overflow-y-auto">
                  {eventos.map((ev) => (
                    <div key={ev.id} className="text-sm py-1 border-b border-slate-800">
                      <strong>{ev.tipo}</strong> • {formatarData(ev.created_at)}
                      {ev.valor != null && (
                        <span> • {formatarValor(ev.valor)}</span>
                      )}
                      {ev.referencia && <span> • {ev.referencia}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap mt-3">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={registrarPagamentoHoje}
                disabled={salvando}
              >
                Registrar pagamento hoje
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setModalOpen(false)}
                disabled={salvando}
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

export default FinanceiroAdminIsland;
