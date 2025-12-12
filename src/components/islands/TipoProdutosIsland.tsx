import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { titleCaseWithExceptions } from "../../lib/titleCase";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type TipoProduto = {
  id: string;
  nome: string | null;
  tipo: string;
  regra_comissionamento: string;
  soma_na_meta: boolean;
  disponivel_todas_cidades?: boolean | null;
  ativo: boolean;
  created_at: string | null;
};

type Regra = {
  id: string;
  nome: string;
  tipo: string;
};

type ComissaoProduto = {
  rule_id?: string;
  fix_meta_nao_atingida?: number | null;
  fix_meta_atingida?: number | null;
  fix_super_meta?: number | null;
};

export default function TipoProdutosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Parametros");

  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [produtoRegraMap, setProdutoRegraMap] = useState<Record<string, ComissaoProduto>>({});
  const [regraSelecionada, setRegraSelecionada] = useState<string>("");
  const [fixMetaNao, setFixMetaNao] = useState<string>("");
  const [fixMetaAtingida, setFixMetaAtingida] = useState<string>("");
  const [fixSuperMeta, setFixSuperMeta] = useState<string>("");

  const [form, setForm] = useState({
    nome: "",
    tipo: "",
    regra_comissionamento: "geral",
    soma_na_meta: true,
    disponivel_todas_cidades: false,
    ativo: true,
  });

  function handleChange(campo: string, valor: any) {
    setForm((prev) => {
      if (campo === "nome") {
        const nomeVal = String(valor);
        return { ...prev, nome: nomeVal, tipo: prev.tipo || nomeVal };
      }
      return { ...prev, [campo]: valor };
    });
  }

  async function carregar() {
    try {
      setLoading(true);
      setErro(null);

      const [{ data, error }, regrasData, mapData] = await Promise.all([
        supabase.from("tipo_produtos").select("*").order("nome", { ascending: true }),
        supabase
          .from("commission_rule")
          .select("id, nome, tipo")
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("product_commission_rule")
          .select("produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta"),
      ]);

      if (error) throw error;
      setTipos((data || []) as TipoProduto[]);
      setRegras((regrasData.data as any) || []);
      const map: Record<string, ComissaoProduto> = {};
      (mapData.data as any)?.forEach((r: any) => {
        map[r.produto_id] = {
          rule_id: r.rule_id || "",
          fix_meta_nao_atingida: r.fix_meta_nao_atingida,
          fix_meta_atingida: r.fix_meta_atingida,
          fix_super_meta: r.fix_super_meta,
        };
      });
      setProdutoRegraMap(map);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar tipos de produto.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function iniciarNovo() {
    setForm({
      nome: "",
      tipo: "",
      regra_comissionamento: "geral",
      soma_na_meta: true,
      disponivel_todas_cidades: false,
      ativo: true,
    });
    setRegraSelecionada("");
    setFixMetaNao("");
    setFixMetaAtingida("");
    setFixSuperMeta("");
    setEditandoId(null);
    setErro(null);
  }

  function iniciarEdicao(tipoProd: TipoProduto) {
    setEditandoId(tipoProd.id);
    setForm({
      nome: tipoProd.nome || tipoProd.tipo,
      tipo: tipoProd.tipo || tipoProd.nome || "",
      regra_comissionamento: tipoProd.regra_comissionamento,
      soma_na_meta: tipoProd.soma_na_meta,
      disponivel_todas_cidades: !!tipoProd.disponivel_todas_cidades,
      ativo: tipoProd.ativo,
    });
    const comissao = produtoRegraMap[tipoProd.id] || {};
    setRegraSelecionada(comissao.rule_id || "");
    setFixMetaNao(
      comissao.fix_meta_nao_atingida !== null && comissao.fix_meta_nao_atingida !== undefined
        ? String(comissao.fix_meta_nao_atingida)
        : ""
    );
    setFixMetaAtingida(
      comissao.fix_meta_atingida !== null && comissao.fix_meta_atingida !== undefined
        ? String(comissao.fix_meta_atingida)
        : ""
    );
    setFixSuperMeta(
      comissao.fix_super_meta !== null && comissao.fix_super_meta !== undefined
        ? String(comissao.fix_super_meta)
        : ""
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (permissao === "view") {
      setErro("Você não tem permissão para salvar tipos de produto.");
      return;
    }
    const nome = titleCaseWithExceptions(form.nome);
    const tipo = titleCaseWithExceptions(form.tipo || nome);
    if (!nome) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (form.regra_comissionamento === "geral" && !regraSelecionada) {
      setErro("Selecione uma regra de comissão para produtos do tipo 'geral'.");
      return;
    }
    const toNumberOrNull = (v: string) => (v.trim() === "" ? null : Number(v));
    if (form.regra_comissionamento === "diferenciado") {
      const fixNaoNum = toNumberOrNull(fixMetaNao);
      const fixAtNum = toNumberOrNull(fixMetaAtingida);
      const fixSupNum = toNumberOrNull(fixSuperMeta);
      const algumInvalido =
        fixNaoNum === null || isNaN(fixNaoNum) || fixAtNum === null || isNaN(fixAtNum) || fixSupNum === null || isNaN(fixSupNum);
      if (algumInvalido) {
        setErro("Preencha os percentuais fixos para meta não atingida, atingida e super meta (apenas números).");
        return;
      }
    }

    try {
      setErro(null);
      const payload = {
        nome,
        tipo,
        regra_comissionamento: form.regra_comissionamento,
        soma_na_meta: form.soma_na_meta,
        disponivel_todas_cidades: form.disponivel_todas_cidades,
        ativo: form.ativo,
      };

      let tipoId = editandoId;
      if (editandoId) {
        const { error } = await supabase.from("tipo_produtos").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { data: insertData, error } = await supabase
          .from("tipo_produtos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        tipoId = insertData?.id || null;
      }

      if (tipoId) {
        // garante uma regra para respeitar o NOT NULL de rule_id quando diferenciado
        async function garantirRegraFixa(): Promise<string> {
          const nomeRegra = "Comissão Fixa (auto)";
          const { data: regraExistente } = await supabase
            .from("commission_rule")
            .select("id")
            .eq("nome", nomeRegra)
            .maybeSingle();
          if ((regraExistente as any)?.id) return (regraExistente as any).id;

          const { data: regraNova, error: regraErr } = await supabase
            .from("commission_rule")
            .insert({
              nome: nomeRegra,
              descricao: "Gerada automaticamente para produtos diferenciados sem regra vinculada.",
              tipo: "GERAL",
              meta_nao_atingida: 0,
              meta_atingida: 0,
              super_meta: 0,
              ativo: true,
            })
            .select("id")
            .single();
          if (regraErr) throw regraErr;
          return (regraNova as any)?.id;
        }

        const fixNao =
          form.regra_comissionamento === "diferenciado"
            ? toNumberOrNull(fixMetaNao)
            : null;
        const fixAt =
          form.regra_comissionamento === "diferenciado"
            ? toNumberOrNull(fixMetaAtingida)
            : null;
        const fixSup =
          form.regra_comissionamento === "diferenciado"
            ? toNumberOrNull(fixSuperMeta)
            : null;

        let ruleIdToUse = regraSelecionada || produtoRegraMap[tipoId]?.rule_id || null;
        if (form.regra_comissionamento === "diferenciado" && !ruleIdToUse) {
          ruleIdToUse = await garantirRegraFixa();
        }

        if (regraSelecionada || form.regra_comissionamento === "diferenciado") {
          const { error: upsertErr } = await supabase
            .from("product_commission_rule")
            .upsert(
              {
                produto_id: tipoId,
                rule_id: ruleIdToUse,
                ativo: true,
                fix_meta_nao_atingida: fixNao,
                fix_meta_atingida: fixAt,
                fix_super_meta: fixSup,
              },
              { onConflict: "produto_id" }
            );
          if (upsertErr) throw upsertErr;
        } else {
          await supabase.from("product_commission_rule").delete().eq("produto_id", tipoId);
        }
      }

      iniciarNovo();
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar tipo de produto.");
    }
  }

  async function excluir(id: string) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir tipos de produto.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este tipo de produto?")) return;

    try {
      setExcluindoId(id);
      const { error } = await supabase.from("tipo_produtos").delete().eq("id", id);
      if (error) throw error;

      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir tipo de produto. Talvez esteja vinculado a vendas/recibos.");
    } finally {
      setExcluindoId(null);
    }
  }

  const tiposFiltrados = useMemo(() => {
    if (!busca.trim()) return tipos;
    const termo = normalizeText(busca);
    return tipos.filter((p) => normalizeText(p.nome || p.tipo || "").includes(termo));
  }, [busca, tipos]);

  if (loadingPerm) return <div>Carregando permissões...</div>;
  if (!ativo) return <div>Você não possui acesso ao módulo de Parâmetros.</div>;

  return (
    <div className="produtos-page">
      {/* FORM */}
      <div className="card-base card-blue mb-3">
        <form onSubmit={salvar}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                disabled={permissao === "view"}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Modelo de comissão</label>
              <select
                className="form-input"
                value={form.regra_comissionamento}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange("regra_comissionamento", val);
                  if (val === "diferenciado") {
                    setRegraSelecionada("");
                  }
                }}
                disabled={permissao === "view"}
              >
                <option value="geral">Geral (usa regra cadastrada)</option>
                <option value="diferenciado">Diferenciado (percentual fixo)</option>
              </select>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 12 }}>
            <div className="form-group">
              <label className="form-label">Soma na meta?</label>
              <select
                className="form-input"
                value={form.soma_na_meta ? "1" : "0"}
                onChange={(e) => handleChange("soma_na_meta", e.target.value === "1")}
                disabled={permissao === "view"}
              >
                <option value="1">Sim</option>
                <option value="0">Não</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Disponível para todas as cidades?</label>
              <select
                className="form-input"
                value={form.disponivel_todas_cidades ? "1" : "0"}
                onChange={(e) => handleChange("disponivel_todas_cidades", e.target.value === "1")}
                disabled={permissao === "view"}
              >
                <option value="0">Não</option>
                <option value="1">Sim</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ativo?</label>
              <select
                className="form-input"
                value={form.ativo ? "1" : "0"}
                onChange={(e) => handleChange("ativo", e.target.value === "1")}
                disabled={permissao === "view"}
              >
                <option value="1">Sim</option>
                <option value="0">Não</option>
              </select>
            </div>
          </div>

          {form.regra_comissionamento === "geral" && (
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Regra de Comissão *</label>
              <select
                className="form-input"
                value={regraSelecionada}
                onChange={(e) => setRegraSelecionada(e.target.value)}
                disabled={permissao === "view"}
                required
              >
                <option value="">Selecione</option>
                {regras.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome} ({r.tipo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.regra_comissionamento === "diferenciado" && (
            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Comissão fixa (meta não atingida) %</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={fixMetaNao}
                  onChange={(e) => setFixMetaNao(e.target.value)}
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Comissão fixa (meta atingida) %</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={fixMetaAtingida}
                  onChange={(e) => setFixMetaAtingida(e.target.value)}
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Comissão fixa (super meta) %</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={fixSuperMeta}
                  onChange={(e) => setFixSuperMeta(e.target.value)}
                  disabled={permissao === "view"}
                />
              </div>
            </div>
          )}

          {permissao !== "view" && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <button className="btn btn-primary" type="submit">
                {editandoId ? "Salvar alterações" : "Adicionar tipo"}
              </button>

              {editandoId && (
                <button type="button" className="btn btn-light" onClick={iniciarNovo}>
                  Cancelar edição
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* BUSCA */}
      <div className="card-base mb-3">
        <div className="form-group">
          <label className="form-label">Buscar tipo de produto</label>
          <input
            className="form-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite parte do nome..."
          />
        </div>
      </div>

      {erro && <div className="card-base card-config mb-3">{erro}</div>}

      {/* TABELA */}
      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[720px]">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Regra</th>
              <th>Regra vinculada</th>
              <th>Soma meta</th>
              <th>Todas cidades</th>
              <th>Ativo</th>
              <th>Criado em</th>
              <th className="th-actions">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>Carregando tipos de produto...</td>
              </tr>
            )}

            {!loading && tiposFiltrados.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum tipo encontrado.</td>
              </tr>
            )}

            {!loading &&
              tiposFiltrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome || p.tipo}</td>
                  <td>{p.regra_comissionamento}</td>
                  <td>
                    {produtoRegraMap[p.id]?.rule_id
                      ? regras.find((r) => r.id === produtoRegraMap[p.id]?.rule_id)?.nome || "-"
                      : produtoRegraMap[p.id]?.fix_meta_atingida
                        ? "Comissão fixa"
                        : "-"}
                  </td>
                  <td>{p.soma_na_meta ? "Sim" : "Não"}</td>
                  <td>{p.disponivel_todas_cidades ? "Sim" : "Não"}</td>
                  <td style={{ color: p.ativo ? "#22c55e" : "#ef4444" }}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </td>
                  <td>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-"}</td>

                  <td className="th-actions">
                    {permissao !== "view" && (
                      <button className="btn-icon" onClick={() => iniciarEdicao(p)}>
                        ✏️
                      </button>
                    )}

                    {permissao === "admin" && (
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => excluir(p.id)}
                        disabled={excluindoId === p.id}
                      >
                        {excluindoId === p.id ? "..." : "🗑️"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
