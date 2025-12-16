import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";

type Template = {
  id: string;
  nome: string;
  descricao: string | null;
  modo: "FIXO" | "ESCALONAVEL";

  meta_nao_atingida: number | null;
  meta_atingida: number | null;
  super_meta: number | null;

  esc_ativado: boolean;
  esc_inicial_pct: number | null;
  esc_final_pct: number | null;
  esc_incremento_pct_meta: number | null;
  esc_incremento_pct_comissao: number | null;

  esc2_ativado: boolean;
  esc2_inicial_pct: number | null;
  esc2_final_pct: number | null;
  esc2_incremento_pct_meta: number | null;
  esc2_incremento_pct_comissao: number | null;

  ativo: boolean;
};

const initialForm: Template = {
  id: "",
  nome: "",
  descricao: "",
  modo: "FIXO",

  meta_nao_atingida: null,
  meta_atingida: null,
  super_meta: null,

  esc_ativado: false,
  esc_inicial_pct: null,
  esc_final_pct: null,
  esc_incremento_pct_meta: null,
  esc_incremento_pct_comissao: null,

  esc2_ativado: false,
  esc2_inicial_pct: null,
  esc2_final_pct: null,
  esc2_incremento_pct_meta: null,
  esc2_incremento_pct_comissao: null,

  ativo: true,
};

export default function CommissionTemplatesIsland() {
  const { permissao, ativo: acessoAtivo, loading: loadingPerm } =
    usePermissao("Parametros");

  const [form, setForm] = useState<Template>(initialForm);
  const [editId, setEditId] = useState<string | null>(null);

  const [lista, setLista] = useState<Template[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // ============================================================
  // LOADING INICIAL
  // ============================================================
  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setCarregando(true);
      setErro(null);
      setSucesso(null);

      const { data, error } = await supabase
        .from("commission_templates")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;

      setLista(data as Template[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar templates.");
    } finally {
      setCarregando(false);
    }
  }

  // ============================================================
  // FILTRO
  // ============================================================
  const filtrados = useMemo(() => {
    if (!busca.trim()) return lista;
    const t = busca.toLowerCase();
    return lista.filter(
      (x) =>
        x.nome.toLowerCase().includes(t) ||
        (x.descricao || "").toLowerCase().includes(t)
    );
  }, [lista, busca]);

  // ============================================================
  // FORM CHANGE
  // ============================================================
  function handleChange<K extends keyof Template>(campo: K, valor: Template[K]) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  // ============================================================
  // CRUD
  // ============================================================
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!form.nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }

    if (form.modo === "FIXO") {
      if (!form.meta_nao_atingida && !form.meta_atingida && !form.super_meta) {
        setErro("Informe ao menos um percentual no modo Fixo.");
        return;
      }
    }

    try {
      setSalvando(true);

      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao?.trim() || null,
        modo: form.modo,

        meta_nao_atingida: form.meta_nao_atingida,
        meta_atingida: form.meta_atingida,
        super_meta: form.super_meta,

        esc_ativado: form.esc_ativado,
        esc_inicial_pct: form.esc_inicial_pct,
        esc_final_pct: form.esc_final_pct,
        esc_incremento_pct_meta: form.esc_incremento_pct_meta,
        esc_incremento_pct_comissao: form.esc_incremento_pct_comissao,

        esc2_ativado: form.esc2_ativado,
        esc2_inicial_pct: form.esc2_inicial_pct,
        esc2_final_pct: form.esc2_final_pct,
        esc2_incremento_pct_meta: form.esc2_incremento_pct_meta,
        esc2_incremento_pct_comissao: form.esc2_incremento_pct_comissao,

        ativo: form.ativo,
      };

      if (editId) {
        const { error } = await supabase
          .from("commission_templates")
          .update(payload)
          .eq("id", editId);

        if (error) throw error;

        await registrarLog({
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
          acao: "template_comissao_atualizado",
          modulo: "Parametros",
          detalhes: { id: editId, payload },
        });
      } else {
        const { error } = await supabase
          .from("commission_templates")
          .insert(payload);

        if (error) throw error;

        await registrarLog({
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
          acao: "template_comissao_criado",
          modulo: "Parametros",
          detalhes: { payload },
        });
      }

      await carregar();
      iniciarNovo();
      setSucesso("Template salvo com sucesso.");
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar template.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarNovo() {
    setEditId(null);
    setForm(initialForm);
  }

  function iniciarEdicao(t: Template) {
    setEditId(t.id);
    setForm(t);
    setSucesso(null);
    setErro(null);
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir este template?")) return;

    try {
      const { error } = await supabase
        .from("commission_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await registrarLog({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        acao: "template_comissao_excluido",
        modulo: "Parametros",
        detalhes: { id },
      });

      await carregar();
    } catch (e) {
      setErro("Erro ao excluir template.");
    }
  }

  // ============================================================
  // UI
  // ============================================================

  if (loadingPerm) return <div>Carregando permissões...</div>;
  if (!acessoAtivo) return <div>Acesso bloqueado ao módulo Parâmetros.</div>;

  return (
    <div className="commission-templates-page">
      {/* FORMULÁRIO */}
      <div className="card-base card-blue mb-3">
        <form onSubmit={salvar}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Modo *</label>
              <select
                className="form-select"
                value={form.modo}
                onChange={(e) =>
                  handleChange("modo", e.target.value as "FIXO" | "ESCALONAVEL")
                }
              >
                <option value="FIXO">Fixo</option>
                <option value="ESCALONAVEL">Escalonável</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ativo</label>
              <select
                className="form-select"
                value={form.ativo ? "true" : "false"}
                onChange={(e) => handleChange("ativo", e.target.value === "true")}
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
          </div>

          {/* CAMPOS FIXOS */}
          {form.modo === "FIXO" && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">% Não atingida</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.meta_nao_atingida ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "meta_nao_atingida",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">% Atingida</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.meta_atingida ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "meta_atingida",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">% Super Meta</label>
                <input
                  className="form-input"
                  type="number"
                  value={form.super_meta ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "super_meta",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* ESCALONÁVEL */}
          {form.modo === "ESCALONAVEL" && (
            <>
              <h3 className="mt-2">Escalonamento 1</h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ativado?</label>
                  <select
                    className="form-select"
                    value={form.esc_ativado ? "true" : "false"}
                    onChange={(e) =>
                      handleChange("esc_ativado", e.target.value === "true")
                    }
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Inicial %</label>
                  <input
                    className="form-input"
                    type="number"
                  value={form.esc_inicial_pct ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "esc_inicial_pct",
                      e.target.value ? Number(e.target.value) : null
                    )
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Final %</label>
                  <input
                    className="form-input"
                    type="number"
                  value={form.esc_final_pct ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "esc_final_pct",
                      e.target.value ? Number(e.target.value) : null
                    )
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Incremento % Meta</label>
                  <input
                    className="form-input"
                    type="number"
                  value={form.esc_incremento_pct_meta ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "esc_incremento_pct_meta",
                      e.target.value ? Number(e.target.value) : null
                    )
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Incremento % Comissão</label>
                  <input
                    className="form-input"
                    type="number"
                  value={form.esc_incremento_pct_comissao ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "esc_incremento_pct_comissao",
                      e.target.value ? Number(e.target.value) : null
                    )
                    }
                  />
                </div>
              </div>

              <h3 className="mt-2">Escalonamento 2</h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ativado?</label>
                  <select
                    className="form-select"
                    value={form.esc2_ativado ? "true" : "false"}
                    onChange={(e) =>
                      handleChange("esc2_ativado", e.target.value === "true")
                    }
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Inicial %</label>
                  <input
                    className="form-input"
                    type="number"
                  value={form.esc2_inicial_pct ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "esc2_inicial_pct",
                      e.target.value ? Number(e.target.value) : null
                    )
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Final %</label>
                  <input
                    className="form-input"
                    type="number"
                  value={form.esc2_final_pct ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "esc2_final_pct",
                      e.target.value ? Number(e.target.value) : null
                    )
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Incremento % Meta</label>
                  <input
                    className="form-input"
                    type="number"
                  value={form.esc2_incremento_pct_meta ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "esc2_incremento_pct_meta",
                      e.target.value ? Number(e.target.value) : null
                    )
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Incremento % Comissão</label>
                  <input
                    className="form-input"
                    type="number"
                  value={form.esc2_incremento_pct_comissao ?? ""}
                  min={0}
                  step="0.1"
                  onChange={(e) =>
                    handleChange(
                      "esc2_incremento_pct_comissao",
                      e.target.value ? Number(e.target.value) : null
                    )
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group mt-2">
            <label className="form-label">Descrição</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.descricao || ""}
              onChange={(e) => handleChange("descricao", e.target.value)}
            />
          </div>

          {erro && (
            <div className="card-base card-config mb-2">
              <strong>Erro:</strong> {erro}
            </div>
          )}
          {sucesso && (
            <div className="card-base card-green mb-2">
              {sucesso}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando
              ? "Salvando..."
              : editId
              ? "Salvar alterações"
              : "Criar template"}
          </button>

          {editId && (
            <button
              type="button"
              className="btn btn-light"
              style={{ marginLeft: 8 }}
              onClick={iniciarNovo}
            >
              Cancelar
            </button>
          )}
        </form>
      </div>

      {/* BUSCA */}
      <div className="card-base card-blue mb-3">
        <div className="form-group">
          <label className="form-label">Buscar template</label>
          <input
            className="form-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Busque por nome ou descrição..."
          />
        </div>
      </div>

      {/* TABELA */}
      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[820px]">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Modo</th>
              <th>Ativo</th>
              <th className="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={4}>Carregando templates...</td>
              </tr>
            )}

            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhum template encontrado.</td>
              </tr>
            )}

            {!carregando &&
              filtrados.map((t) => (
                <tr key={t.id}>
                  <td>{t.nome}</td>
                  <td>{t.modo}</td>
                  <td>{t.ativo ? "Sim" : "Não"}</td>
                  <td className="th-actions flex gap-2">
                    <button
                      className="btn-icon"
                      title="Editar"
                      onClick={() => iniciarEdicao(t)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      title="Excluir"
                      onClick={() => excluir(t.id)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
