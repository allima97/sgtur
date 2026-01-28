import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

type PlanoRow = {
  id: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number;
  moeda: string;
  ativo: boolean;
};

type PlanoForm = {
  id?: string;
  nome: string;
  descricao: string;
  valor_mensal: string;
  moeda: string;
  ativo: boolean;
};

const defaultForm: PlanoForm = {
  nome: "",
  descricao: "",
  valor_mensal: "",
  moeda: "BRL",
  ativo: true,
};

const PlanosAdminIsland: React.FC = () => {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("AdminPlanos") || can("AdminDashboard") || can("Admin");

  const [planos, setPlanos] = useState<PlanoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlanoForm>(defaultForm);
  const [salvando, setSalvando] = useState(false);

  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

  useEffect(() => {
    carregarPlanos();
  }, []);

  async function carregarPlanos() {
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase
        .from("plans")
        .select("id, nome, descricao, valor_mensal, moeda, ativo")
        .order("nome", { ascending: true });
      if (error) throw error;
      setPlanos((data as PlanoRow[]) || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar planos.");
    } finally {
      setLoading(false);
    }
  }

  function openModal(plano?: PlanoRow) {
    if (plano) {
      setForm({
        id: plano.id,
        nome: plano.nome,
        descricao: plano.descricao || "",
        valor_mensal: plano.valor_mensal?.toString() || "",
        moeda: plano.moeda || "BRL",
        ativo: plano.ativo,
      });
    } else {
      setForm(defaultForm);
    }
    setModalOpen(true);
  }

  async function salvarPlano(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    try {
      const valor = form.valor_mensal.trim();
      const valorNumero = valor ? Number(valor) : 0;

      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        valor_mensal: Number.isFinite(valorNumero) ? valorNumero : 0,
        moeda: form.moeda || "BRL",
        ativo: form.ativo,
      };

      if (!payload.nome) {
        setErro("Informe o nome do plano.");
        return;
      }

      if (form.id) {
        const { error } = await supabase
          .from("plans")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("plans")
          .insert(payload);
        if (error) throw error;
      }

      showToast("Plano salvo com sucesso.", "success");
      setModalOpen(false);
      setForm(defaultForm);
      await carregarPlanos();
    } catch (err) {
      console.error(err);
      setErro("Não foi possível salvar o plano.");
    } finally {
      setSalvando(false);
    }
  }

  async function toggleStatus(plano: PlanoRow) {
    try {
      const { error } = await supabase
        .from("plans")
        .update({ ativo: !plano.ativo })
        .eq("id", plano.id);
      if (error) throw error;
      await carregarPlanos();
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar status do plano.", "error");
    }
  }

  if (loadingPerm) return <LoadingUsuarioContext />;

  if (!podeVer) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Apenas administradores podem acessar os planos.</h3>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-semibold">💳 Planos do sistema</h3>
        <button className="btn btn-primary" onClick={() => openModal()}>
          Novo plano
        </button>
      </div>

      {erro && (
        <div className="mt-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {loading ? (
        <p className="mt-4">Carregando planos...</p>
      ) : (
        <div className="table-container overflow-x-auto mt-4">
          <table className="table-default table-header-red min-w-[720px]">
            <thead>
              <tr>
                <th>Plano</th>
                <th>Descrição</th>
                <th>Valor mensal</th>
                <th>Moeda</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {planos.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhum plano cadastrado.</td>
                </tr>
              ) : (
                planos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.descricao || "—"}</td>
                    <td>R$ {p.valor_mensal.toFixed(2)}</td>
                    <td>{p.moeda}</td>
                    <td className={p.ativo ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                      {p.ativo ? "Sim" : "Não"}
                    </td>
                    <td className="th-actions">
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => openModal(p)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => toggleStatus(p)}
                        >
                          {p.ativo ? "Desativar" : "Ativar"}
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

      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4">
          <form
            className="card-base card-config w-full max-w-xl"
            onSubmit={salvarPlano}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold">
                {form.id ? "Editar plano" : "Novo plano"}
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

            <div className="form-group">
              <label className="form-label">Nome</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
              />
            </div>

            <div className="form-row">
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
              <div className="form-group flex-1">
                <label className="form-label">Moeda</label>
                <select
                  className="form-select"
                  value={form.moeda}
                  onChange={(e) => setForm((prev) => ({ ...prev, moeda: e.target.value }))}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Ativo?</label>
                <select
                  className="form-select"
                  value={form.ativo ? "true" : "false"}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, ativo: e.target.value === "true" }))
                  }
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap mt-3">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
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

export default PlanosAdminIsland;
