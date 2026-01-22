import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type Rule = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: "GERAL" | "ESCALONAVEL";
  meta_nao_atingida: number | null;
  meta_atingida: number | null;
  super_meta: number | null;
  ativo: boolean;
  commission_tier?: Tier[];
};

type Tier = {
  id?: string;
  faixa: "PRE" | "POS";
  de_pct: number;
  ate_pct: number;
  inc_pct_meta: number;
  inc_pct_comissao: number;
};

const emptyRule = {
  id: "",
  nome: "",
  descricao: "",
  tipo: "GERAL" as "GERAL" | "ESCALONAVEL",
  meta_nao_atingida: 0,
  meta_atingida: 0,
  super_meta: 0,
  ativo: true,
  tiers: [] as Tier[],
};

export default function CommissionRulesIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Parametros");
  const podeEditar = permissao === "admin" || permissao === "edit";

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRule);
  const [salvando, setSalvando] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase
        .from("commission_rule")
        .select("*, commission_tier(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRules((data || []) as any);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar regras de comissão.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(campo: string, valor: any) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function addTier(faixa: "PRE" | "POS") {
    setForm((prev) => ({
      ...prev,
      tiers: [
        ...(prev.tiers || []),
        { faixa, de_pct: 0, ate_pct: 0, inc_pct_meta: 0, inc_pct_comissao: 0 },
      ],
    }));
  }

  function updateTier(idx: number, campo: string, valor: any) {
    setForm((prev) => {
      const list = [...(prev.tiers || [])];
      (list[idx] as any)[campo] = valor;
      return { ...prev, tiers: list };
    });
  }

  function removeTier(idx: number) {
    setForm((prev) => ({
      ...prev,
      tiers: (prev.tiers || []).filter((_, i) => i !== idx),
    }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEditar) return;
    setErroValidacao(null);
    if (!form.nome.trim()) {
      setErro("Informe o nome da regra.");
      return;
    }
    if (form.tipo === "ESCALONAVEL") {
      if (!form.tiers || form.tiers.length === 0) {
        setErroValidacao("Adicione pelo menos uma faixa PRE ou POS.");
        return;
      }
      for (const t of form.tiers) {
        if (t.de_pct > t.ate_pct) {
          setErroValidacao("Em uma faixa, o valor inicial não pode ser maior que o final.");
          return;
        }
      }
      const faixas = ["PRE", "POS"] as const;
      for (const faixa of faixas) {
        const lista = (form.tiers || [])
          .filter((t) => t.faixa === faixa)
          .sort((a, b) => a.de_pct - b.de_pct);
        for (let i = 1; i < lista.length; i++) {
          const prev = lista[i - 1];
          const curr = lista[i];
          if (prev.ate_pct > curr.de_pct) {
            setErroValidacao(
              `Faixas ${faixa} sobrepostas: finalize a faixa anterior em ${prev.ate_pct}% antes de iniciar ${curr.de_pct}%.`,
            );
            return;
          }
        }
      }
    }
    try {
      setSalvando(true);
      setErro(null);
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao || null,
        tipo: form.tipo,
        meta_nao_atingida: form.meta_nao_atingida ?? 0,
        meta_atingida: form.meta_atingida ?? 0,
        super_meta: form.super_meta ?? 0,
        ativo: form.ativo,
      };

      let regraId = editId;
      if (editId) {
        const { error } = await supabase
          .from("commission_rule")
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
        regraId = editId;
      } else {
        const { data, error } = await supabase
          .from("commission_rule")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        regraId = data?.id;
      }

      if (regraId) {
        await supabase.from("commission_tier").delete().eq("rule_id", regraId);
        if (form.tiers && form.tiers.length > 0) {
          const tiers = form.tiers.map((t) => ({
            rule_id: regraId,
            faixa: t.faixa,
            de_pct: Number(t.de_pct) || 0,
            ate_pct: Number(t.ate_pct) || 0,
            inc_pct_meta: Number(t.inc_pct_meta) || 0,
            inc_pct_comissao: Number(t.inc_pct_comissao) || 0,
            ativo: true,
          }));
          const { error: tierErr } = await supabase.from("commission_tier").insert(tiers);
          if (tierErr) throw tierErr;
        }
      }

      await registrarLog({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        acao: editId ? "commission_rule_editada" : "commission_rule_criada",
        modulo: "Parametros",
        detalhes: payload,
      });

      setForm(emptyRule);
      setEditId(null);
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar regra.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirFormularioRegra() {
    setForm(emptyRule);
    setEditId(null);
    setErro(null);
    setErroValidacao(null);
    setMostrarFormulario(true);
  }

  function fecharFormularioRegra() {
    setForm(emptyRule);
    setEditId(null);
    setErro(null);
    setErroValidacao(null);
    setMostrarFormulario(false);
  }

  async function inativar(id: string) {
    if (!podeEditar) return;
    if (!confirm("Inativar esta regra?")) return;
    const { error } = await supabase
      .from("commission_rule")
      .update({ ativo: false })
      .eq("id", id);
    if (!error) carregar();
  }

  async function excluirRegra(id: string) {
    if (!podeEditar) return;
    if (!confirm("Excluir permanentemente esta regra?")) return;
    const { error: tierErr } = await supabase.from("commission_tier").delete().eq("rule_id", id);
    if (tierErr) {
      setErro("Erro ao excluir faixas da regra.");
      return;
    }
    const { error } = await supabase.from("commission_rule").delete().eq("id", id);
    if (error) {
      setErro("Erro ao excluir regra.");
      return;
    }
    await registrarLog({
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      acao: "commission_rule_excluida",
      modulo: "Parametros",
      detalhes: { id },
    });
    carregar();
  }

  function editar(regra: Rule) {
    setEditId(regra.id);
    setForm({
      id: regra.id,
      nome: regra.nome,
      descricao: regra.descricao || "",
      tipo: regra.tipo,
      meta_nao_atingida: regra.meta_nao_atingida ?? 0,
      meta_atingida: regra.meta_atingida ?? 0,
      super_meta: regra.super_meta ?? 0,
      ativo: regra.ativo,
      tiers:
        regra.tipo === "ESCALONAVEL"
          ? regra.commission_tier?.map((t) => ({
              faixa: t.faixa as "PRE" | "POS",
              de_pct: t.de_pct,
              ate_pct: t.ate_pct,
              inc_pct_meta: t.inc_pct_meta,
              inc_pct_comissao: t.inc_pct_comissao,
            })) || []
          : [],
    });
    setMostrarFormulario(true);
    setErro(null);
    setErroValidacao(null);
  }

  if (loadingPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return <div className="card-base card-config">Acesso negado ao módulo de Parâmetros.</div>;
  }

  return (
      <div className="card-base card-blue form-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 className="card-title" style={{ marginBottom: 6 }}>Regras cadastradas</h3>
          </div>
          {podeEditar && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={abrirFormularioRegra}
              disabled={mostrarFormulario}
            >
              Adicionar regra
            </button>
          )}
        </div>

      {erro && (
        <div className="card-base card-config mb-2">
          <strong>{erro}</strong>
        </div>
      )}
      {mostrarFormulario && erroValidacao && (
        <div className="card-base card-config mb-2">
          <strong>{erroValidacao}</strong>
        </div>
      )}

      {mostrarFormulario && (
        <form onSubmit={salvar}>
            <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input
              className="form-input"
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              required
              disabled={!podeEditar}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={form.tipo}
              onChange={(e) =>
                handleChange("tipo", e.target.value === "ESCALONAVEL" ? "ESCALONAVEL" : "GERAL")
              }
              disabled={!podeEditar}
            >
              <option value="GERAL">Geral (percentuais fixos)</option>
              <option value="ESCALONAVEL">Escalonável (faixas)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Meta não atingida (%)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              value={form.meta_nao_atingida}
              onChange={(e) => handleChange("meta_nao_atingida", Number(e.target.value))}
              disabled={!podeEditar}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Meta atingida (%)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              value={form.meta_atingida}
              onChange={(e) => handleChange("meta_atingida", Number(e.target.value))}
              disabled={!podeEditar}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Super meta (%)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              value={form.super_meta}
              onChange={(e) => handleChange("super_meta", Number(e.target.value))}
              disabled={!podeEditar}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-input"
            rows={2}
            value={form.descricao || ""}
            onChange={(e) => handleChange("descricao", e.target.value)}
            disabled={!podeEditar}
          />
        </div>

        {form.tipo === "ESCALONAVEL" && (
          <div className="card-base card-purple mb-2" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0 }}>Faixas (PRE/POS)</h4>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-primary" onClick={() => addTier("PRE")} disabled={!podeEditar}>
                  + Faixa PRE
                </button>
                <button type="button" className="btn btn-primary" onClick={() => addTier("POS")} disabled={!podeEditar}>
                  + Faixa POS
                </button>
              </div>
            </div>
            <div className="table-container overflow-x-auto">
              <table className="table-default table-header-blue table-mobile-cards min-w-[800px]">
                <thead>
                  <tr>
                    <th>Faixa</th>
                    <th>De (%)</th>
                    <th>Até (%)</th>
                    <th>Inc. Meta (%)</th>
                    <th>Inc. Comissão (%)</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(!form.tiers || form.tiers.length === 0) && (
                    <tr>
                      <td colSpan={6}>Nenhuma faixa adicionada.</td>
                    </tr>
                  )}
                  {form.tiers?.map((t, idx) => (
                    <tr key={idx}>
                      <td data-label="Faixa">{t.faixa}</td>
                      <td data-label="De (%)">
                        <input
                          className="form-input"
                          type="number"
                          step="0.01"
                          value={t.de_pct}
                          onChange={(e) => updateTier(idx, "de_pct", Number(e.target.value))}
                          disabled={!podeEditar}
                        />
                      </td>
                      <td data-label="Até (%)">
                        <input
                          className="form-input"
                          type="number"
                          step="0.01"
                          value={t.ate_pct}
                          onChange={(e) => updateTier(idx, "ate_pct", Number(e.target.value))}
                          disabled={!podeEditar}
                        />
                      </td>
                      <td data-label="Inc. Meta (%)">
                        <input
                          className="form-input"
                          type="number"
                          step="0.01"
                          value={t.inc_pct_meta}
                          onChange={(e) => updateTier(idx, "inc_pct_meta", Number(e.target.value))}
                          disabled={!podeEditar}
                        />
                      </td>
                      <td data-label="Inc. Comissão (%)">
                        <input
                          className="form-input"
                          type="number"
                          step="0.01"
                          value={t.inc_pct_comissao}
                          onChange={(e) => updateTier(idx, "inc_pct_comissao", Number(e.target.value))}
                          disabled={!podeEditar}
                        />
                      </td>
                      <td className="th-actions" data-label="Ações">
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="btn-icon btn-danger"
                            onClick={() => removeTier(idx)}
                            disabled={!podeEditar}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap mt-2">
          <button className="btn btn-primary" type="submit" disabled={!podeEditar || salvando}>
            {salvando ? "Salvando..." : editId ? "Salvar alterações" : "Salvar regra"}
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={fecharFormularioRegra}
            disabled={salvando}
          >
            Cancelar
          </button>
        </div>
          </form>
      )}

      <div
        className="table-container overflow-x-auto"
        style={{ maxHeight: "65vh", overflowY: "auto" }}
      >
          <table className="table-default table-header-blue table-mobile-cards min-w-[900px]">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Ativo</th>
                <th>Faixas</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}>Carregando...</td>
                </tr>
              )}
              {!loading && rules.length === 0 && (
                <tr>
                  <td colSpan={5}>Nenhuma regra cadastrada.</td>
                </tr>
              )}
              {!loading &&
                rules.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Nome">{r.nome}</td>
                    <td data-label="Tipo">{r.tipo}</td>
                    <td data-label="Ativo">{r.ativo ? "Sim" : "Não"}</td>
                    <td data-label="Faixas">{r.commission_tier?.length || 0}</td>
                    <td className="th-actions" data-label="Ações">
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => editar(r)} title="Editar">
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => inativar(r.id)}
                          disabled={!podeEditar}
                          title="Inativar"
                        >
                          ⏸️
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => excluirRegra(r.id)}
                          disabled={!podeEditar}
                          title="Excluir"
                        >
                          🗑️
                        </button>
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
