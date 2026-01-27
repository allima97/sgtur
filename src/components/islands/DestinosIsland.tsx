import React, { useEffect, useMemo, useState } from "react";
import { usePermissoesStore } from "../../lib/permissoesStore";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import { normalizeText } from "../../lib/normalizeText";
import { useCrudResource } from "../../lib/useCrudResource";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import DataTable from "../ui/DataTable";
import ConfirmDialog from "../ui/ConfirmDialog";
import TableActions from "../ui/TableActions";
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
};

type Cidade = {
  id: string;
  nome: string;
  subdivisao_id: string;
};

type Destino = {
  id: string;
  nome: string;
  cidade_id: string;
  informacoes_importantes: string | null;
  tipo: string | null;
  atracao_principal: string | null;
  melhor_epoca: string | null;
  duracao_sugerida: string | null;
  nivel_preco: string | null;
  imagem_url: string | null;
  ativo: boolean | null;
  created_at: string | null;
};

type FormState = {
  nome: string;
  pais_id: string;
  cidade_id: string;
  tipo: string;
  atracao_principal: string;
  melhor_epoca: string;
  duracao_sugerida: string;
  nivel_preco: string;
  imagem_url: string;
  informacoes_importantes: string;
  ativo: boolean;
};

const initialForm: FormState = {
  nome: "",
  pais_id: "",
  cidade_id: "",
  tipo: "",
  atracao_principal: "",
  melhor_epoca: "",
  duracao_sugerida: "",
  nivel_preco: "",
  imagem_url: "",
  informacoes_importantes: "",
  ativo: true,
};

export default function DestinosIsland() {
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
    load: loadSubdivisoes,
  } = useCrudResource<Subdivisao>({
    table: "subdivisoes",
    select: "id, nome, pais_id",
  });

  const {
    items: cidades,
    loading: loadingCidades,
    load: loadCidades,
  } = useCrudResource<Cidade>({
    table: "cidades",
    select: "id, nome, subdivisao_id",
  });

  const {
    items: destinos,
    loading: loadingDestinos,
    saving: salvando,
    deletingId: excluindoId,
    error: erro,
    setError: setErro,
    load: loadDestinos,
    create,
    update,
    remove,
  } = useCrudResource<Destino>({
    table: "destinos",
    select:
      "id, nome, cidade_id, informacoes_importantes, tipo, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, created_at",
  });

  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [destinoParaExcluir, setDestinoParaExcluir] = useState<Destino | null>(null);
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

  const loading =
    loadingPaises || loadingSubdivisoes || loadingCidades || loadingDestinos;

  async function carregarDadosIniciais() {
    const errorMessage =
      "Erro ao carregar destinos. Verifique se as tabelas 'paises', 'subdivisoes' e 'cidades' existem e se as colunas estao corretas.";

    setErro(null);

    const [paisesRes, subdivisoesRes, cidadesRes, destinosRes] = await Promise.all([
      loadPaises({
        order: { column: "nome", ascending: true },
        errorMessage,
      }),
      loadSubdivisoes({
        order: { column: "nome", ascending: true },
        errorMessage,
      }),
      loadCidades({
        order: { column: "nome", ascending: true },
        errorMessage,
      }),
      loadDestinos({
        order: { column: "nome", ascending: true },
        errorMessage,
      }),
    ]);

    if (paisesRes.error || subdivisoesRes.error || cidadesRes.error || destinosRes.error) {
      if (!destinosRes.error) {
        setErro(errorMessage);
      }
      return;
    }
  }

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const subdivisaoMap = useMemo(() => new Map(subdivisoes.map((s) => [s.id, s])), [subdivisoes]);

  const cidadesFiltradas = useMemo(() => {
    if (!form.pais_id) return cidades;
    return cidades.filter((c) => {
      const subdivisao = subdivisaoMap.get(c.subdivisao_id);
      return subdivisao?.pais_id === form.pais_id;
    });
  }, [cidades, form.pais_id, subdivisaoMap]);

  const destinosEnriquecidos = useMemo(() => {
    const cidadeMap = new Map(cidades.map((c) => [c.id, c]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));

    return destinos.map((d) => {
      const cidade = cidadeMap.get(d.cidade_id || "");
      const subdivisao = cidade ? subdivisaoMap.get(cidade.subdivisao_id) : undefined;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : undefined;
      return {
        ...d,
        cidade_nome: cidade?.nome || "",
        pais_nome: pais?.nome || "",
      };
    });
  }, [destinos, cidades, paises, subdivisaoMap]);

  const destinosFiltrados = useMemo(() => {
    if (!busca.trim()) return destinosEnriquecidos;
    const termo = normalizeText(busca);
    return destinosEnriquecidos.filter((d) => {
      return (
        normalizeText(d.nome).includes(termo) ||
        normalizeText(d.cidade_nome).includes(termo) ||
        normalizeText(d.pais_nome).includes(termo)
      );
    });
  }, [destinosEnriquecidos, busca]);
  const destinosExibidos = useMemo(() => {
    return busca.trim() ? destinosFiltrados : destinosFiltrados.slice(0, 5);
  }, [destinosFiltrados, busca]);

  function handleChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
      ...(campo === "pais_id" ? { cidade_id: "" } : {}),
    }));
  }

  function iniciarNovo() {
    setEditandoId(null);
    setForm(initialForm);
  }

  function iniciarEdicao(destino: Destino & { cidade_nome?: string; pais_nome?: string }) {
    const cidade = cidades.find((c) => c.id === destino.cidade_id);
    const subdivisao = cidade ? subdivisaoMap.get(cidade.subdivisao_id) : undefined;
    const paisId = subdivisao?.pais_id || "";

    setEditandoId(destino.id);
    setForm({
      nome: destino.nome,
      pais_id: paisId,
      cidade_id: destino.cidade_id,
      tipo: destino.tipo || "",
      atracao_principal: destino.atracao_principal || "",
      melhor_epoca: destino.melhor_epoca || "",
      duracao_sugerida: destino.duracao_sugerida || "",
      nivel_preco: destino.nivel_preco || "",
      imagem_url: destino.imagem_url || "",
      informacoes_importantes: destino.informacoes_importantes || "",
      ativo: destino.ativo ?? true,
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (modoSomenteLeitura) {
      setErro("Voce nao tem permissao para salvar destinos.");
      return;
    }

    if (!form.nome.trim()) {
      setErro("Nome e obrigatorio.");
      return;
    }
    if (!form.cidade_id) {
      setErro("Cidade e obrigatoria.");
      return;
    }

    setErro(null);

    const payload = {
      nome: titleCaseWithExceptions(form.nome),
      cidade_id: form.cidade_id,
      tipo: form.tipo.trim() || null,
      atracao_principal: form.atracao_principal.trim() || null,
      melhor_epoca: form.melhor_epoca.trim() || null,
      duracao_sugerida: form.duracao_sugerida.trim() || null,
      nivel_preco: form.nivel_preco.trim() || null,
      imagem_url: form.imagem_url.trim() || null,
      informacoes_importantes: form.informacoes_importantes.trim() || null,
      ativo: form.ativo,
    };

    const result = editandoId
      ? await update(editandoId, payload, {
          errorMessage: "Erro ao salvar destino. Verifique os dados e tente novamente.",
        })
      : await create(payload, {
          errorMessage: "Erro ao salvar destino. Verifique os dados e tente novamente.",
        });

    if (result.error) return;

    setForm(initialForm);
    setEditandoId(null);
    await carregarDadosIniciais();
  }

  async function excluir(id: string) {
    if (!podeExcluir) {
      showToast("Somente administradores podem excluir destinos.", "error");
      return;
    }

    setErro(null);

    const result = await remove(id, {
      errorMessage:
        "Nao foi possivel excluir o destino. Verifique se nao existem vendas vinculadas.",
    });

    if (result.error) return;

    await carregarDadosIniciais();
  }

  function solicitarExclusao(destino: Destino) {
    if (!podeExcluir) {
      showToast("Somente administradores podem excluir destinos.", "error");
      return;
    }
    setDestinoParaExcluir(destino);
  }

  async function confirmarExclusao() {
    if (!destinoParaExcluir) return;
    await excluir(destinoParaExcluir.id);
    setDestinoParaExcluir(null);
  }

  if (loadingPerm) {
    return <LoadingUsuarioContext />;
  }
  if (!podeVer) return <div>Voce nao possui acesso ao modulo de Cadastros.</div>;

  return (
    <div className="destinos-page">
      {/* Formulario */}
      <div className="card-base card-blue form-card mb-3">
        <form onSubmit={salvar}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome do destino *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                placeholder="Ex: Orlando, Paris, Gramado..."
                disabled={modoSomenteLeitura}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pais *</label>
              <select
                className="form-select"
                value={form.pais_id}
                onChange={(e) => handleChange("pais_id", e.target.value)}
                disabled={modoSomenteLeitura}
              >
                <option value="">Selecione um pais</option>
                {paises.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cidade *</label>
              <select
                className="form-select"
                value={form.cidade_id}
                onChange={(e) => handleChange("cidade_id", e.target.value)}
                disabled={modoSomenteLeitura}
              >
                <option value="">Selecione uma cidade</option>
                {cidadesFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <input
                className="form-input"
                value={form.tipo}
                onChange={(e) => handleChange("tipo", e.target.value)}
                placeholder="Ex: Cidade, Praia, Parque, Serra..."
                disabled={modoSomenteLeitura}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Atracao principal</label>
              <input
                className="form-input"
                value={form.atracao_principal}
                onChange={(e) => handleChange("atracao_principal", e.target.value)}
                placeholder="Ex: Disney, Torre Eiffel, Centro Historico..."
                disabled={modoSomenteLeitura}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Melhor epoca</label>
              <input
                className="form-input"
                value={form.melhor_epoca}
                onChange={(e) => handleChange("melhor_epoca", e.target.value)}
                placeholder="Ex: Dezembro a Marco"
                disabled={modoSomenteLeitura}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duracao sugerida</label>
              <input
                className="form-input"
                value={form.duracao_sugerida}
                onChange={(e) => handleChange("duracao_sugerida", e.target.value)}
                placeholder="Ex: 7 dias"
                disabled={modoSomenteLeitura}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nivel de preco</label>
              <input
                className="form-input"
                value={form.nivel_preco}
                onChange={(e) => handleChange("nivel_preco", e.target.value)}
                placeholder="Ex: Economico, Intermediario, Premium"
                disabled={modoSomenteLeitura}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Imagem (URL)</label>
              <input
                className="form-input"
                value={form.imagem_url}
                onChange={(e) => handleChange("imagem_url", e.target.value)}
                placeholder="URL de uma imagem do destino"
                disabled={modoSomenteLeitura}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ativo</label>
              <select
                className="form-select"
                value={form.ativo ? "true" : "false"}
                onChange={(e) => handleChange("ativo", e.target.value === "true")}
                disabled={modoSomenteLeitura}
              >
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Informacoes importantes</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.informacoes_importantes}
              onChange={(e) => handleChange("informacoes_importantes", e.target.value)}
              placeholder="Observacoes gerais, dicas, documentacao necessaria, etc."
              disabled={modoSomenteLeitura}
            />
          </div>

          <div className="mt-2">
            {!modoSomenteLeitura && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : editandoId
                  ? "Salvar alteracoes"
                  : "Adicionar destino"}
              </button>
            )}

            {editandoId && !modoSomenteLeitura && (
              <button
                type="button"
                className="btn btn-light"
                style={{ marginLeft: 8 }}
                onClick={iniciarNovo}
              >
                Cancelar edicao
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Filtro */}
      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Buscar destino</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busque por nome, cidade ou pais..."
            />
          </div>
        </div>
      </div>

      {erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {/* Tabela */}
      <DataTable
        className="table-default table-header-blue table-mobile-cards min-w-[960px]"
        containerStyle={{ maxHeight: "65vh", overflowY: "auto" }}
        headers={
          <tr>
            <th>Destino</th>
            <th>Cidade</th>
            <th>Pais</th>
            <th>Tipo</th>
            <th>Nivel de preco</th>
            <th>Ativo</th>
            <th>Criado em</th>
            <th className="th-actions">Acoes</th>
          </tr>
        }
        loading={loading}
        loadingMessage="Carregando destinos..."
        empty={!loading && destinosExibidos.length === 0}
        emptyMessage="Nenhum destino encontrado."
        colSpan={8}
      >
        {destinosExibidos.map((d) => (
          <tr key={d.id}>
            <td data-label="Destino">{d.nome}</td>
            <td data-label="Cidade">{(d as any).cidade_nome || "-"}</td>
            <td data-label="Pais">{(d as any).pais_nome || "-"}</td>
            <td data-label="Tipo">{d.tipo || "-"}</td>
            <td data-label="Nivel de preco">{d.nivel_preco || "-"}</td>
            <td data-label="Ativo">{d.ativo ? "Sim" : "Nao"}</td>
            <td data-label="Criado em">
              {d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : "-"}
            </td>
            <td className="th-actions" data-label="Acoes">
              <TableActions
                show={!modoSomenteLeitura}
                actions={[
                  ...(!modoSomenteLeitura
                    ? [
                        {
                          key: "edit",
                          label: "Editar",
                          onClick: () => iniciarEdicao(d),
                          icon: "??",
                        },
                      ]
                    : []),
                  ...(podeExcluir
                    ? [
                        {
                          key: "delete",
                          label: "Excluir",
                          onClick: () => solicitarExclusao(d),
                          icon: excluindoId === d.id ? "..." : "???",
                          variant: "danger" as const,
                          disabled: excluindoId === d.id,
                        },
                      ]
                    : []),
                ]}
              />
            </td>
          </tr>
        ))}
      </DataTable>

      <ConfirmDialog
        open={Boolean(destinoParaExcluir)}
        title="Excluir destino"
        message={`Tem certeza que deseja excluir ${destinoParaExcluir?.nome || "este destino"}?`}
        confirmLabel={excluindoId ? "Excluindo..." : "Excluir"}
        confirmVariant="danger"
        confirmDisabled={Boolean(excluindoId)}
        onCancel={() => setDestinoParaExcluir(null)}
        onConfirm={confirmarExclusao}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

