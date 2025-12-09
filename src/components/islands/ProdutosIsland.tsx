import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

type Produto = {
  id: string;
  nome: string;
  tipo: string;
  regra_comissionamento: string;
  soma_na_meta: boolean;
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

export default function ProdutosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");

  const [produtos, setProdutos] = useState<Produto[]>([]);
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

  async function carregarProdutos() {
    try {
      setLoading(true);
      setErro(null);

      const [{ data, error }, regrasData, mapData] = await Promise.all([
        supabase.from("produtos").select("*").order("nome", { ascending: true }),
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
      setProdutos(data || []);
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
      setErro("Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  function iniciarNovo() {
    setForm({
      nome: "",
      tipo: "",
      regra_comissionamento: "geral",
      soma_na_meta: true,
      ativo: true,
    });
    setRegraSelecionada("");
    setFixMetaNao("");
    setFixMetaAtingida("");
    setFixSuperMeta("");
    setEditandoId(null);
  }

  function iniciarEdicao(prod: Produto) {
    setEditandoId(prod.id);
    setForm({
      nome: prod.nome,
      tipo: prod.tipo || prod.nome,
      regra_comissionamento: prod.regra_comissionamento,
      soma_na_meta: prod.soma_na_meta,
      ativo: prod.ativo,
    });
    const comissao = produtoRegraMap[prod.id] || {};
    setRegraSelecionada(comissao.rule_id || "");
    setFixMetaNao(
      comissao.fix_meta_nao_atingida !== null && comissao.fix_meta_nao_atingida !== undefined
        ? String(comissao.fix_meta_nao_atingida)
        : "",
    );
    setFixMetaAtingida(
      comissao.fix_meta_atingida !== null && comissao.fix_meta_atingida !== undefined
        ? String(comissao.fix_meta_atingida)
        : "",
    );
    setFixSuperMeta(
      comissao.fix_super_meta !== null && comissao.fix_super_meta !== undefined
        ? String(comissao.fix_super_meta)
        : "",
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (permissao === "view") {
      setErro("Você não tem permissão para salvar produtos.");
      return;
    }
    const nome = form.nome.trim();
    const tipo = form.tipo.trim() || nome; // evita campo duplicado vazio
    if (!nome) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (form.regra_comissionamento === "geral" && !regraSelecionada) {
      setErro("Selecione uma regra de comissão para produtos do tipo 'geral'.");
      return;
    }

    try {
      setErro(null);
      const payload = {
        nome,
        tipo,
        regra_comissionamento: form.regra_comissionamento,
        soma_na_meta: form.soma_na_meta,
        ativo: form.ativo,
      };

      let produtoId = editandoId;
      if (editandoId) {
        const { error } = await supabase
          .from("produtos")
          .update(payload)
          .eq("id", editandoId);
        if (error) throw error;
      } else {
        const { data: insertData, error } = await supabase
          .from("produtos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        produtoId = insertData?.id || null;
      }

      if (produtoId) {
        const fixNao = form.regra_comissionamento === "diferenciado" ? Number(fixMetaNao) || null : null;
        const fixAt = form.regra_comissionamento === "diferenciado" ? Number(fixMetaAtingida) || null : null;
        const fixSup = form.regra_comissionamento === "diferenciado" ? Number(fixSuperMeta) || null : null;

        if (regraSelecionada || form.regra_comissionamento === "diferenciado") {
          await supabase
            .from("product_commission_rule")
            .upsert(
              {
                produto_id: produtoId,
                rule_id: regraSelecionada || null,
                ativo: true,
                fix_meta_nao_atingida: fixNao,
                fix_meta_atingida: fixAt,
                fix_super_meta: fixSup,
              },
              { onConflict: "produto_id" },
            );
        } else {
          await supabase.from("product_commission_rule").delete().eq("produto_id", produtoId);
        }
      }

      iniciarNovo();
      await carregarProdutos();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar produto.");
    }
  }

  async function excluir(id: string) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir produtos.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      setExcluindoId(id);
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;

      await carregarProdutos();
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir produto. Talvez esteja vinculado a vendas/recibos.");
    } finally {
      setExcluindoId(null);
    }
  }

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtos;
    const termo = busca.toLowerCase();
    return produtos.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [busca, produtos]);

  if (loadingPerm) return <div>Carregando permissões...</div>;
  if (!ativo) return <div>Você não possui acesso ao módulo de Cadastros.</div>;

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

          <div className="form-row mt-1">
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
            <div className="form-row">
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
                {editandoId ? "Salvar alterações" : "Adicionar produto"}
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
          <label className="form-label">Buscar produto</label>
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
              <th>Ativo</th>
              <th>Criado em</th>
              <th className="th-actions">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>Carregando produtos...</td>
              </tr>
            )}

            {!loading && produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum produto encontrado.</td>
              </tr>
            )}

            {!loading &&
              produtosFiltrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.regra_comissionamento}</td>
                  <td>
                    {produtoRegraMap[p.id]?.rule_id
                      ? regras.find((r) => r.id === produtoRegraMap[p.id]?.rule_id)?.nome || "-"
                      : produtoRegraMap[p.id]?.fix_meta_atingida
                        ? "Comissão fixa"
                        : "-"}
                  </td>
                  <td>{p.soma_na_meta ? "Sim" : "Não"}</td>
                  <td style={{ color: p.ativo ? "#22c55e" : "#ef4444" }}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </td>
                  <td>
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>

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
