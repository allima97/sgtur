import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { registrarLog } from "../../lib/logs";

const MOEDA_SUGESTOES = ["R$", "USD", "EUR"];

type CambioRecord = {
  id: string;
  moeda: string;
  data: string;
  valor: number | null;
  created_at: string | null;
  owner_user_id: string | null;
  owner_user?: {
    nome_completo: string | null;
  };
};

type FormState = {
  moeda: string;
  data: string;
  valor: string;
};

const agoraData = () => new Date().toISOString().slice(0, 10);
const buildInitialForm = (): FormState => ({ moeda: "USD", data: agoraData(), valor: "" });

function parseDecimal(value: string) {
  if (!value || typeof value !== "string") return null;
  const cleaned = value.replace(/\./g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function formatValorNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function ParametrosCambiosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Parametros");
  const [form, setForm] = useState<FormState>(buildInitialForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cambios, setCambios] = useState<CambioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const nivel = (permissao || "").toLowerCase();
  const podeEscrever = nivel === "admin" || nivel === "edit" || nivel === "create";
  const podeExcluir = nivel === "admin" || nivel === "edit";

  const resetForm = useCallback(() => {
    setForm(buildInitialForm());
    setEditingId(null);
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setSucesso(null);
    try {
      const { data: session } = await supabase.auth.getUser();
      const userId = session?.user?.id || null;
      setUserId(userId);

      if (!userId) {
        setErro("Usuário não autenticado.");
        setCambios([]);
        return;
      }

      const { data: usuario, error: usuarioErr } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle();

      if (usuarioErr) throw usuarioErr;

      const companyValue = usuario?.company_id || null;
      setCompanyId(companyValue);

      if (!companyValue) {
        setErro("Usuário não está vinculado a uma empresa.");
        setCambios([]);
        return;
      }

      const { data, error } = await supabase
        .from("parametros_cambios")
        .select(
          "id, moeda, data, valor, created_at, owner_user_id, owner_user:owner_user_id (nome_completo)"
        )
        .eq("company_id", companyValue)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCambios(data || []);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível carregar os câmbios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!podeEscrever || !companyId) return;
    setErro(null);
    setSucesso(null);

    const valorNumero = parseDecimal(form.valor);
    const moeda = form.moeda.trim();

    if (!moeda) {
      setErro("Informe a moeda.");
      return;
    }

    if (!form.data) {
      setErro("Informe a data.");
      return;
    }

    if (valorNumero == null) {
      setErro("Informe um valor válido para o câmbio.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        company_id: companyId,
        owner_user_id: userId,
        moeda,
        data: form.data,
        valor: valorNumero,
      };
      let error = null;
      if (editingId) {
        const res = await supabase.from("parametros_cambios").update(payload).eq("id", editingId);
        error = res.error;
      } else {
        const res = await supabase.from("parametros_cambios").insert(payload);
        error = res.error;
      }
      if (error) throw error;

      setSucesso(editingId ? "Câmbio atualizado com sucesso." : "Câmbio salvo com sucesso.");
      resetForm();
      await carregar();
      await registrarLog({
        user_id: userId,
        acao: editingId ? "parametros_cambios_atualizacao" : "parametros_cambios_cadastro",
        modulo: "Parametros",
        detalhes: {
          id: editingId || null,
          moeda,
          data: form.data,
          valor: valorNumero
        }
      });
    } catch (err) {
      console.error(err);
      setErro("Não foi possível salvar o câmbio.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!podeExcluir) return;
    if (!window.confirm("Deseja excluir este câmbio?")) return;
    setErro(null);
    setSucesso(null);
    setLoading(true);
    try {
      const { error } = await supabase.from("parametros_cambios").delete().eq("id", id);
      if (error) throw error;
      setSucesso("Câmbio excluído.");
      await carregar();
      await registrarLog({
        user_id: userId,
        acao: "parametros_cambios_exclusao",
        modulo: "Parametros",
        detalhes: { id }
      });
    } catch (err) {
      console.error(err);
      setErro("Não foi possível excluir o câmbio.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cambio: CambioRecord) => {
    setEditingId(cambio.id);
    setForm({
      moeda: cambio.moeda,
      data: cambio.data,
      valor: cambio.valor != null ? cambio.valor.toFixed(2) : "",
    });
    setSucesso(null);
    setErro(null);
  };

  const tituloTabela = useMemo(() => {
    if (!cambios.length) return "Nenhum câmbio cadastrado.";
    return `${cambios.length} câmbio(s) registrado(s).`;
  }, [cambios]);

  if (loading || loadingPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return <div>Acesso ao módulo de Parâmetros bloqueado.</div>;
  }

  return (
    <div className="card-base">
      <h2 className="card-title">Câmbios</h2>
      <p className="card-subtitle">Cadastre o valor de câmbio aplicado em cada dia.</p>

      {erro && <div className="auth-error">{erro}</div>}
      {sucesso && <div className="auth-success">{sucesso}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Moeda</label>
            <input
              type="text"
              className="form-input"
              list="moeda-sugestoes"
              value={form.moeda}
              onChange={(event) => handleFormChange("moeda", event.target.value)}
              disabled={!podeEscrever}
            />
            <datalist id="moeda-sugestoes">
              {MOEDA_SUGESTOES.map((moeda) => (
                <option key={moeda} value={moeda} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label">Data</label>
            <input
              type="date"
              className="form-input"
              value={form.data}
              onChange={(event) => handleFormChange("data", event.target.value)}
              disabled={!podeEscrever}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Valor (R$)</label>
            <input
              type="text"
              className="form-input"
              inputMode="decimal"
              placeholder="Ex: 6,50"
              value={form.valor}
              onChange={(event) => handleFormChange("valor", event.target.value)}
              disabled={!podeEscrever}
            />
          </div>

            <div className="form-group" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!podeEscrever || salvando || !companyId}
              >
                {salvando ? (editingId ? "Atualizando..." : "Salvando...") : editingId ? "Atualizar câmbio" : "Salvar câmbio"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={resetForm}
                  disabled={salvando}
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </div>

        {!companyId && (
          <div className="auth-error">
            Você precisa estar vinculado a uma empresa para cadastrar câmbios.
          </div>
        )}
        {!podeEscrever && (
          <div style={{ marginTop: 8, color: "#f97316", fontSize: "0.9rem" }}>
            Você não tem permissão para cadastrar ou remover câmbios. Solicite acesso ao
            administrador.
          </div>
        )}
      </form>

      <div className="table-container overflow-x-auto mt-6">
        <div className="flex items-center justify-between mb-2">
          <strong>{tituloTabela}</strong>
          <button
            type="button"
            className="btn btn-light"
            onClick={carregar}
            disabled={loading}
          >
            Recarregar
          </button>
        </div>
        <table className="table-default table-header-blue table-mobile-cards min-w-[600px]">
          <thead>
            <tr>
              <th>Data</th>
              <th>Moeda</th>
              <th>Valor (R$)</th>
              <th>Cadastrado por</th>
              <th>Criado em</th>
              {podeExcluir && <th className="th-actions">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {cambios.length === 0 && (
              <tr>
                <td colSpan={podeExcluir ? 6 : 5}>Nenhum câmbio cadastrado ainda.</td>
              </tr>
            )}
            {cambios.map((cambio) => (
              <tr key={cambio.id}>
                <td data-label="Data">{cambio.data}</td>
                <td data-label="Moeda">{cambio.moeda}</td>
                <td data-label="Valor (R$)">{formatValorNumber(cambio.valor)}</td>
                <td data-label="Cadastrado por">
                  {cambio.owner_user?.nome_completo || cambio.owner_user_id || "—"}
                </td>
                <td data-label="Criado em">
                  {cambio.created_at
                    ? new Date(cambio.created_at).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td className="th-actions" data-label="Ações">
                  <div className="action-buttons">
                    {podeEscrever && (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Editar câmbio"
                        onClick={() => handleEdit(cambio)}
                      >
                        ✏️
                      </button>
                    )}
                    {podeExcluir && (
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        title="Excluir câmbio"
                        onClick={() => handleDelete(cambio.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
