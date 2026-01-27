import React, { useEffect, useMemo, useState } from "react";
import { usePermissoesStore } from "../../lib/permissoesStore";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import { normalizeText } from "../../lib/normalizeText";
import { useCrudResource } from "../../lib/useCrudResource";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import DataTable from "../ui/DataTable";
import ConfirmDialog from "../ui/ConfirmDialog";
import TableActions from "../ui/TableActions";
import SearchInput from "../ui/SearchInput";
import EmptyState from "../ui/EmptyState";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

type Pais = {
  id: string;
  nome: string;
};

type Subdivisao = {
  id: string;
  nome: string;
  pais_id: string;
  codigo_admin1: string;
  tipo: string | null;
  created_at: string | null;
};

type FormState = {
  nome: string;
  pais_id: string;
  codigo_admin1: string;
  tipo: string;
};

const initialForm: FormState = {
  nome: "",
  pais_id: "",
  codigo_admin1: "",
  tipo: "",
};

export default function SubdivisoesIsland() {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("Cadastros");
  const podeCriar = can("Cadastros", "create");
  const podeEditar = can("Cadastros", "edit");
  const podeExcluir = can("Cadastros", "admin");
  const modoSomenteLeitura = !podeCriar && !podeEditar;

  const {
    items: paises,
    loading: loadingPaises,
    load: loadPaises,
  } = useCrudResource<Pais>({
    table: "paises",
    select: "id, nome",
  });

  const {
    items: subdivisoes,
    loading: loadingSubdivisoes,
    saving: salvando,
    deletingId: excluindoId,
    error: erro,
    setError: setErro,
    load: loadSubdivisoes,
    create,
    update,
    remove,
  } = useCrudResource<Subdivisao>({
    table: "subdivisoes",
    select: "id, nome, pais_id, codigo_admin1, tipo, created_at",
  });

  const [form, setForm] = useState<FormState>(initialForm);
  const [busca, setBusca] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [carregouTodos, setCarregouTodos] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [subdivisaoParaExcluir, setSubdivisaoParaExcluir] = useState<Subdivisao | null>(null);
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

  const loading = loadingSubdivisoes || loadingPaises;

  async function carregarDados(todos = false) {
    setErro(null);

    const [paisesResult, subdivisoesResult] = await Promise.all([
      loadPaises({
        order: { column: "nome", ascending: true },
        errorMessage: "Erro ao carregar subdivisoes.",
      }),
      loadSubdivisoes({
        order: {
          column: todos ? "nome" : "created_at",
          ascending: todos,
        },
        limit: todos ? undefined : 5,
        errorMessage: "Erro ao carregar subdivisoes.",
      }),
    ]);

    if (paisesResult.error || subdivisoesResult.error) {
      if (paisesResult.error && !subdivisoesResult.error) {
        setErro("Erro ao carregar subdivisoes.");
      }
      return;
    }

    setCarregouTodos(todos);
  }

  useEffect(() => {
    carregarDados(false);
  }, []);

  useEffect(() => {
    if (busca.trim() && !carregouTodos) {
      carregarDados(true);
    } else if (!busca.trim() && carregouTodos) {
      carregarDados(false);
    }
  }, [busca, carregouTodos]);

  const subdivisoesEnriquecidas = useMemo(() => {
    const paisMap = new Map(paises.map((p) => [p.id, p.nome]));
    return subdivisoes.map((s) => ({
      ...s,
      pais_nome: paisMap.get(s.pais_id) || "",
    }));
  }, [subdivisoes, paises]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return subdivisoesEnriquecidas;
    const termo = normalizeText(busca);
    return subdivisoesEnriquecidas.filter(
      (s) =>
        normalizeText(s.nome).includes(termo) ||
        normalizeText(s.pais_nome).includes(termo) ||
        normalizeText(s.codigo_admin1).includes(termo)
    );
  }, [busca, subdivisoesEnriquecidas]);

  function handleChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function iniciarNovo() {
    setForm(initialForm);
    setEditandoId(null);
    setErro(null);
  }

  function iniciarEdicao(subdivisao: Subdivisao) {
    setEditandoId(subdivisao.id);
    setForm({
      nome: subdivisao.nome,
      pais_id: subdivisao.pais_id,
      codigo_admin1: subdivisao.codigo_admin1,
      tipo: subdivisao.tipo || "",
    });
    setMostrarFormulario(true);
  }

  function abrirFormulario() {
    iniciarNovo();
    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    iniciarNovo();
    setMostrarFormulario(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (modoSomenteLeitura) {
      setErro("Voce nao tem permissao para salvar subdivisoes.");
      return;
    }
    if (!form.nome.trim() || !form.pais_id || !form.codigo_admin1.trim()) {
      setErro("Preencha nome, codigo e pais.");
      return;
    }

    setErro(null);

    const payload = {
      nome: titleCaseWithExceptions(form.nome),
      pais_id: form.pais_id,
      codigo_admin1: form.codigo_admin1.trim(),
      tipo: form.tipo.trim() || null,
    };

    const result = editandoId
      ? await update(editandoId, payload, { errorMessage: "Erro ao salvar subdivisao." })
      : await create(payload, { errorMessage: "Erro ao salvar subdivisao." });

    if (result.error) return;

    await carregarDados(carregouTodos);
    fecharFormulario();
  }

  async function excluir(id: string) {
    if (!podeExcluir) {
      showToast("Somente administradores podem excluir subdivisoes.", "error");
      return;
    }

    setErro(null);

    const result = await remove(id, {
      errorMessage: "Erro ao excluir subdivisao. Verifique se nao existem cidades vinculadas.",
    });

    if (result.error) return;

    await carregarDados(carregouTodos);
  }

  function solicitarExclusao(subdivisao: Subdivisao) {
    if (!podeExcluir) {
      showToast("Somente administradores podem excluir subdivisoes.", "error");
      return;
    }
    setSubdivisaoParaExcluir(subdivisao);
  }

  async function confirmarExclusao() {
    if (!subdivisaoParaExcluir) return;
    await excluir(subdivisaoParaExcluir.id);
    setSubdivisaoParaExcluir(null);
  }

  if (loadingPerm) {
    return (
      <div className="paises-page">
        <LoadingUsuarioContext />
      </div>
    );
  }
  if (!podeVer) return <div className="paises-page">Voce nao possui acesso ao modulo de Cadastros.</div>;

  return (
    <div className="paises-page">
      {!mostrarFormulario && (
        <div
          className="card-base mb-3 list-toolbar-sticky"
          style={{ background: "#f5f3ff", borderColor: "#ddd6fe" }}
        >
          <div
            className="form-row mobile-stack"
            style={{ gap: 12, gridTemplateColumns: "minmax(240px, 1fr) auto", alignItems: "flex-end" }}
          >
            <div style={{ flex: "1 1 320px" }}>
              <SearchInput
                label="Buscar subdivisão"
                value={busca}
                onChange={setBusca}
                placeholder="Nome, país ou código..."
              />
            </div>
            {!modoSomenteLeitura && (
              <div className="form-group" style={{ alignItems: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  onClick={abrirFormulario}
                  disabled={mostrarFormulario}
                >
                  Adicionar Estado/Província
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="card-base card-blue form-card mb-3">
          <form onSubmit={salvar}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome da subdivisão *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                  placeholder="Ex: Sao Paulo, California..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Código admin1 *</label>
                <input
                  className="form-input"
                  value={form.codigo_admin1}
                  onChange={(e) => handleChange("codigo_admin1", e.target.value)}
                  placeholder="Ex: SP, CA, NY..."
                />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <input
                  className="form-input"
                  value={form.tipo}
                  onChange={(e) => handleChange("tipo", e.target.value)}
                  placeholder="Ex: Estado, Provincia, Regiao..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pais *</label>
                <select
                  className="form-select"
                  value={form.pais_id}
                  onChange={(e) => handleChange("pais_id", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {paises.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mobile-stack-buttons" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={salvando || modoSomenteLeitura}>
                {salvando ? "Salvando..." : "Salvar estado/província"}
              </button>
              <button type="button" className="btn btn-light" onClick={fecharFormulario} disabled={salvando}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!mostrarFormulario && !carregouTodos && (
        <div className="card-base card-config mb-3">
          Ultimas Subdivisoes Cadastradas (5). Digite na busca para consultar todas.
        </div>
      )}

      {!mostrarFormulario && erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {!mostrarFormulario && (
        <DataTable
          className="table-default table-header-blue table-mobile-cards min-w-[720px]"
          containerStyle={{ maxHeight: "65vh", overflowY: "auto" }}
          headers={
            <tr>
              <th>Subdivisao</th>
              <th>Codigo</th>
              <th>Pais</th>
              <th>Tipo</th>
              <th>Criado em</th>
              <th className="th-actions">Acoes</th>
            </tr>
          }
          loading={loading}
          loadingMessage="Carregando subdivisoes..."
          empty={!loading && filtrados.length === 0}
          emptyMessage={
            <EmptyState
              title="Nenhuma subdivisão encontrada"
              description={
                busca.trim()
                  ? "Tente ajustar a busca ou cadastre uma subdivisão."
                  : "Cadastre uma subdivisão para começar."
              }
            />
          }
          colSpan={6}
        >
          {filtrados.map((s) => (
            <tr key={s.id}>
              <td data-label="Subdivisao">{s.nome}</td>
              <td data-label="Codigo">{s.codigo_admin1}</td>
              <td data-label="Pais">{(s as any).pais_nome || "-"}</td>
              <td data-label="Tipo">{s.tipo || "-"}</td>
              <td data-label="Criado em">
                {s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "-"}
              </td>
              <td className="th-actions" data-label="Acoes">
                <TableActions
                  show={!modoSomenteLeitura}
                  actions={[
                    {
                      key: "edit",
                      label: "Editar",
                      onClick: () => iniciarEdicao(s),
                      icon: "??",
                    },
                    ...(podeExcluir
                      ? [
                          {
                            key: "delete",
                            label: "Excluir",
                            onClick: () => solicitarExclusao(s),
                            icon: excluindoId === s.id ? "..." : "???",
                            variant: "danger" as const,
                            disabled: excluindoId === s.id,
                          },
                        ]
                      : []),
                  ]}
                />
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <ConfirmDialog
        open={Boolean(subdivisaoParaExcluir)}
        title="Excluir subdivisão"
        message={`Excluir ${subdivisaoParaExcluir?.nome || "esta subdivisão"}?`}
        confirmLabel={excluindoId ? "Excluindo..." : "Excluir"}
        confirmVariant="danger"
        confirmDisabled={Boolean(excluindoId)}
        onCancel={() => setSubdivisaoParaExcluir(null)}
        onConfirm={confirmarExclusao}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

