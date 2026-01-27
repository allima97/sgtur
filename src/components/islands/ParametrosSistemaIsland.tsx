import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import { useCrudResource } from "../../lib/useCrudResource";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { registrarLog } from "../../lib/logs";

type ParametrosSistema = {
  id?: string;
  company_id: string | null;
  owner_user_id?: string | null;
  owner_user_nome?: string | null;
  usar_taxas_na_meta: boolean;
  foco_valor: "bruto" | "liquido";
  modo_corporativo: boolean;
  politica_cancelamento: "cancelar_venda" | "estornar_recibos";
  foco_faturamento: "bruto" | "liquido";
  exportacao_pdf: boolean;
  exportacao_excel: boolean;
};

type ParametrosSistemaRow = {
  id: string;
  company_id: string | null;
  owner_user_id?: string | null;
  owner_user?: { nome_completo: string | null } | null;
  usar_taxas_na_meta?: boolean | null;
  foco_valor?: string | null;
  modo_corporativo?: boolean | null;
  politica_cancelamento?: string | null;
  foco_faturamento?: string | null;
  exportacao_pdf?: boolean | null;
  exportacao_excel?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const DEFAULT_PARAMS: ParametrosSistema = {
  company_id: null,
  owner_user_id: null,
  usar_taxas_na_meta: false,
  foco_valor: "bruto",
  modo_corporativo: false,
  politica_cancelamento: "cancelar_venda",
  foco_faturamento: "bruto",
  exportacao_pdf: false,
  exportacao_excel: false,
};

export default function ParametrosSistemaIsland() {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("Parametros");
  const podeAdministrar = can("Parametros", "edit");

  const [params, setParams] = useState<ParametrosSistema>(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [origemDados, setOrigemDados] = useState<"default" | "banco">("default");
  const [ownerNome, setOwnerNome] = useState<string | null>(null);
  const { upsert } = useCrudResource<ParametrosSistemaRow>({
    table: "parametros_comissao",
    select:
      "id, company_id, owner_user_id, usar_taxas_na_meta, foco_valor, modo_corporativo, politica_cancelamento, foco_faturamento, exportacao_pdf, exportacao_excel, updated_at, created_at, owner_user:owner_user_id (nome_completo)",
  });

  const bloqueado = !podeVer || !podeAdministrar;

  useEffect(() => {
    carregar();
  }, []);

  const focoLabel = useMemo(
    () => (params.foco_valor === "bruto" ? "Valor bruto" : "Valor líquido"),
    [params.foco_valor],
  );

  async function carregar() {
    try {
      setLoading(true);
      setErro(null);
      setSucesso(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        return;
      }

      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("company_id, nome_completo")
        .eq("id", userId)
        .maybeSingle();

      if (userErr) throw userErr;

      const companyId = userData?.company_id || null;
      const usuarioNome = userData?.nome_completo || null;

      const { data, error } = await supabase
        .from("parametros_comissao")
        .select("*, owner_user:owner_user_id (nome_completo)")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) {
        console.error(error);
        setParams({ ...DEFAULT_PARAMS, company_id: companyId, owner_user_id: userId });
      } else if (data) {
        setParams({
          id: data.id,
          company_id: companyId,
          owner_user_id: data.owner_user_id || userId,
          owner_user_nome: data.owner_user?.nome_completo || usuarioNome,
          usar_taxas_na_meta: !!data.usar_taxas_na_meta,
          foco_valor: data.foco_valor === "liquido" ? "liquido" : "bruto",
          modo_corporativo: !!data.modo_corporativo,
          politica_cancelamento:
            data.politica_cancelamento === "estornar_recibos"
              ? "estornar_recibos"
              : "cancelar_venda",
          foco_faturamento: data.foco_faturamento === "liquido" ? "liquido" : "bruto",
          exportacao_pdf: !!data.exportacao_pdf,
          exportacao_excel: !!data.exportacao_excel,
        });
        setUltimaAtualizacao(data.updated_at || data.created_at || null);
        setOrigemDados("banco");
        setOwnerNome(data.owner_user?.nome_completo || usuarioNome);
      } else {
        setParams({
          ...DEFAULT_PARAMS,
          company_id: companyId,
          owner_user_id: userId,
          owner_user_nome: usuarioNome,
        });
        setUltimaAtualizacao(null);
        setOrigemDados("default");
        setOwnerNome(usuarioNome);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar parâmetros.");
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    if (bloqueado) return;
    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);

      const payload = {
        company_id: params.company_id,
        owner_user_id: params.owner_user_id,
        usar_taxas_na_meta: params.usar_taxas_na_meta,
        foco_valor: params.foco_valor,
        modo_corporativo: params.modo_corporativo,
        politica_cancelamento: params.politica_cancelamento,
        foco_faturamento: params.foco_faturamento,
        exportacao_pdf: params.exportacao_pdf,
        exportacao_excel: params.exportacao_excel,
      };

      const result = await upsert(payload, {
        select: "id",
        onConflict: "company_id",
        errorMessage: "Erro ao salvar parâmetros.",
      });

      const novoId = (result.data as { id?: string } | null)?.id;
      if (novoId) {
        setParams((prev) => ({ ...prev, id: novoId }));
      }
      if (result?.error) throw result.error;

      await registrarLog({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        acao: "parametros_sistema_salvos",
        modulo: "Parametros",
        detalhes: payload,
      });

      setSucesso("Parâmetros salvos com sucesso.");
      setUltimaAtualizacao(new Date().toISOString());
      setOrigemDados("banco");
      setOwnerNome(params.owner_user_nome || null);
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar parâmetros.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading || loadingPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!podeVer) {
    return <div>Acesso ao módulo de Parâmetros bloqueado.</div>;
  }

  return (
    <div className="card-base">
      <h2 className="card-title">Parâmetros do Sistema</h2>

      {erro && <div className="auth-error">{erro}</div>}
      {sucesso && <div className="auth-success">{sucesso}</div>}
      {ultimaAtualizacao && (
        <p style={{ marginTop: 0, color: "#64748b", fontSize: "0.9rem" }}>
          Última atualização: {new Date(ultimaAtualizacao).toLocaleString("pt-BR")}
        </p>
      )}
      {origemDados && (
        <p style={{ marginTop: 4, color: "#94a3b8", fontSize: "0.85rem" }}>
          Origem dos dados: {origemDados === "banco" ? "Banco de dados" : "Valores padrão"}
        </p>
      )}
      {ownerNome && (
        <p style={{ marginTop: 4, color: "#94a3b8", fontSize: "0.85rem" }}>
          Última edição por: {ownerNome}
        </p>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Meta considera taxas?</label>
          <div>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={params.usar_taxas_na_meta}
                onChange={(e) =>
                  setParams((p) => ({ ...p, usar_taxas_na_meta: e.target.checked }))
                }
                disabled={bloqueado}
              />
              Incluir taxas no cálculo de meta
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Foco das metas</label>
          <select
            className="form-select"
            value={params.foco_valor}
            onChange={(e) =>
              setParams((p) => ({
                ...p,
                foco_valor: e.target.value === "liquido" ? "liquido" : "bruto",
              }))
            }
            disabled={bloqueado}
          >
            <option value="bruto">Valor bruto</option>
            <option value="liquido">Valor líquido</option>
          </select>
          <small style={{ color: "#64748b" }}>{focoLabel} será usado em metas e dashboards.</small>
        </div>

        <div className="form-group">
          <label className="form-label">Modo corporativo</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={params.modo_corporativo}
              onChange={(e) =>
                setParams((p) => ({ ...p, modo_corporativo: e.target.checked }))
              }
              disabled={bloqueado}
            />
            Ativar modo corporativo (multi-empresa, controles extras)
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">Política de cancelamento</label>
          <select
            className="form-select"
            value={params.politica_cancelamento}
            onChange={(e) =>
              setParams((p) => ({
                ...p,
                politica_cancelamento:
                  e.target.value === "estornar_recibos"
                    ? "estornar_recibos"
                    : "cancelar_venda",
              }))
            }
            disabled={bloqueado}
          >
            <option value="cancelar_venda">Cancelar venda (exclui venda)</option>
            <option value="estornar_recibos">Estornar recibos (manter venda)</option>
          </select>
          <small style={{ color: "#64748b" }}>
            Define comportamento padrão ao cancelar vendas.
          </small>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Foco de faturamento</label>
          <select
            className="form-select"
            value={params.foco_faturamento}
            onChange={(e) =>
              setParams((p) => ({
                ...p,
                foco_faturamento: e.target.value === "liquido" ? "liquido" : "bruto",
              }))
            }
            disabled={bloqueado}
          >
            <option value="bruto">Valor bruto</option>
            <option value="liquido">Valor líquido</option>
          </select>
          <small style={{ color: "#64748b" }}>
            Define base para faturamento e relatórios financeiros.
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Exportações</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={params.exportacao_pdf}
                onChange={(e) =>
                  setParams((p) => ({ ...p, exportacao_pdf: e.target.checked }))
                }
                disabled={bloqueado}
              />
              Habilitar exportação em PDF
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={params.exportacao_excel}
                onChange={(e) =>
                  setParams((p) => ({ ...p, exportacao_excel: e.target.checked }))
                }
                disabled={bloqueado}
              />
              Habilitar exportação em Excel
            </label>
          </div>
          <small style={{ color: "#64748b" }}>
            Mantém coerência com os módulos de relatórios e orçamentos.
          </small>
        </div>
      </div>

      <div className="mobile-stack-buttons" style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          className="btn btn-primary"
          onClick={salvar}
          disabled={bloqueado || salvando}
        >
          {salvando ? "Salvando..." : "Salvar parâmetros"}
        </button>
        <button className="btn btn-secondary" onClick={carregar} disabled={salvando}>
          Recarregar
        </button>
      </div>

      {bloqueado && (
        <p style={{ marginTop: 12, color: "#f97316" }}>
          Você não tem permissão para editar. Solicite acesso ao administrador.
        </p>
      )}
    </div>
  );
}
