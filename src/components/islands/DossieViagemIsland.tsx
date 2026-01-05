import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { formatarDataParaExibicao } from "../../lib/formatDate";

type ViagemAcompanhante = {
  id: string;
  papel: string | null;
  documento_url: string | null;
  observacoes: string | null;
  cliente_acompanhantes?: {
    nome_completo?: string | null;
    cpf?: string | null;
    rg?: string | null;
    telefone?: string | null;
    grau_parentesco?: string | null;
  } | null;
};

type ViagemServico = {
  id: string;
  tipo: string | null;
  fornecedor: string | null;
  descricao: string | null;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  valor: number | null;
  moeda: string | null;
  voucher_url: string | null;
  observacoes: string | null;
};

type ViagemDocumento = {
  id: string;
  titulo: string | null;
  tipo: string | null;
  url: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string | null;
};

type ViagemDetalhe = {
  id: string;
  company_id?: string | null;
  venda_id?: string | null;
  orcamento_id?: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  origem: string | null;
  destino: string | null;
  responsavel_user_id: string | null;
  responsavel?: { nome_completo?: string | null } | null;
  observacoes: string | null;
  venda?: { id: string; cliente_id: string | null; clientes?: { nome?: string | null } | null } | null;
  orcamento?: { id: string; cliente_id: string | null; clientes?: { nome?: string | null } | null } | null;
  viagem_acompanhantes?: ViagemAcompanhante[];
  viagem_servicos?: ViagemServico[];
  viagem_documentos?: ViagemDocumento[];
};

interface Props {
  viagemId?: string;
}

const STORAGE_BUCKET = "viagens";

function sanitizeFileName(filename: string) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function DossieViagemIsland({ viagemId }: Props) {
  const { permissao, loading: loadingPerm, ativo } = usePermissao("Operacao");
  const podeVer = permissao !== "none";
  const podeCriar =
    permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir = permissao === "delete" || permissao === "admin";

  const [viagem, setViagem] = useState<ViagemDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acompanhantesCliente, setAcompanhantesCliente] = useState<
    { id: string; nome_completo: string; cpf?: string | null; telefone?: string | null; grau_parentesco?: string | null }[]
  >([]);
  const [novoAcomp, setNovoAcomp] = useState<{ acompanhante_id: string; papel: string; documento_url: string; observacoes: string }>({
    acompanhante_id: "",
    papel: "passageiro",
    documento_url: "",
    observacoes: "",
  });
  const [savingAcomp, setSavingAcomp] = useState(false);

  const emptyServico = {
    tipo: "aereo",
    fornecedor: "",
    descricao: "",
    status: "ativo",
    data_inicio: "",
    data_fim: "",
    valor: "",
    moeda: "BRL",
    voucher_url: "",
    observacoes: "",
  };
  const [servicoForm, setServicoForm] = useState<typeof emptyServico>(emptyServico);
  const [editServicoId, setEditServicoId] = useState<string | null>(null);
  const [savingServico, setSavingServico] = useState(false);
  const [removendoServicoId, setRemovendoServicoId] = useState<string | null>(null);

  const [docTitulo, setDocTitulo] = useState("");
  const [docTipo, setDocTipo] = useState("voucher");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [removendoDocId, setRemovendoDocId] = useState<string | null>(null);

  const servicos = viagem?.viagem_servicos || [];
  const documentos = viagem?.viagem_documentos || [];

  useEffect(() => {
    if (!viagemId) return;
    if (!loadingPerm && podeVer) {
      carregar();
    }
  }, [viagemId, loadingPerm, podeVer]);

  async function carregar() {
    if (!viagemId) return;
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase
        .from("viagens")
        .select(
          `
          id,
          company_id,
          venda_id,
          orcamento_id,
          data_inicio,
          data_fim,
          status,
          origem,
          destino,
          responsavel_user_id,
          responsavel:users!responsavel_user_id (
            nome_completo
          ),
          observacoes,
          venda:vendas (
            id,
            cliente_id,
            clientes:clientes (
              id,
              nome
            )
          ),
          orcamento:orcamentos (
            id,
            cliente_id,
            clientes:clientes (
              id,
              nome
            )
          ),
          viagem_acompanhantes (
            id,
            papel,
            documento_url,
            observacoes,
            cliente_acompanhantes:acompanhante_id (
              nome_completo,
              cpf,
              rg,
              telefone,
              grau_parentesco
            )
          ),
          viagem_servicos (
            id,
            tipo,
            fornecedor,
            descricao,
            status,
            data_inicio,
            data_fim,
            valor,
            moeda,
            voucher_url,
            observacoes
          ),
          viagem_documentos (
            id,
            titulo,
            tipo,
            url,
            mime_type,
            size_bytes,
            created_at
          )
        `
        )
        .eq("id", viagemId)
        .maybeSingle();

      if (error) throw error;
      const detalhe = (data || null) as ViagemDetalhe | null;
      setViagem(detalhe);

      // Carrega acompanhantes do cliente base (venda ou orçamento)
      const clienteBaseId =
        (detalhe?.venda?.cliente_id as string | null) ||
        (detalhe?.orcamento?.cliente_id as string | null) ||
        null;

      if (clienteBaseId) {
        const { data: acompDisp, error: acompErr } = await supabase
          .from("cliente_acompanhantes")
          .select("id, nome_completo, cpf, telefone, grau_parentesco")
          .eq("cliente_id", clienteBaseId)
          .eq("ativo", true)
          .order("nome_completo", { ascending: true });
        if (!acompErr && acompDisp) {
          setAcompanhantesCliente(
            acompDisp.map((a: any) => ({
              id: a.id,
              nome_completo: a.nome_completo,
              cpf: a.cpf,
              telefone: a.telefone,
              grau_parentesco: a.grau_parentesco,
            }))
          );
        }
      } else {
        setAcompanhantesCliente([]);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dossiê da viagem.");
      setViagem(null);
    } finally {
      setLoading(false);
    }
  }

  if (loadingPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return <div>Você não possui acesso ao módulo de Operação/Viagens.</div>;
  }

  if (!viagemId) {
    return <div>Nenhuma viagem selecionada.</div>;
  }

  async function adicionarAcompanhante() {
    if (!viagem || !podeCriar) return;
    if (!novoAcomp.acompanhante_id) {
      setErro("Selecione um acompanhante para vincular.");
      return;
    }
    try {
      setSavingAcomp(true);
      setErro(null);
      const payload = {
        viagem_id: viagem.id,
        acompanhante_id: novoAcomp.acompanhante_id,
        company_id: viagem.company_id,
        papel: novoAcomp.papel || null,
        documento_url: novoAcomp.documento_url || null,
        observacoes: novoAcomp.observacoes || null,
      };
      const { error } = await supabase.from("viagem_acompanhantes").insert(payload);
      if (error) throw error;
      // reload
      setNovoAcomp({ acompanhante_id: "", papel: "passageiro", documento_url: "", observacoes: "" });
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao adicionar acompanhante.");
    } finally {
      setSavingAcomp(false);
    }
  }

  async function removerAcompanhante(id: string) {
    if (!podeExcluir) return;
    try {
      setSavingAcomp(true);
      setErro(null);
      const { error } = await supabase
        .from("viagem_acompanhantes")
        .delete()
        .eq("id", id)
        .eq("viagem_id", viagemId);
      if (error) throw error;
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao remover acompanhante.");
    } finally {
      setSavingAcomp(false);
    }
  }

  function iniciarEdicaoServico(servico: ViagemServico) {
    setEditServicoId(servico.id);
    setServicoForm({
      tipo: servico.tipo || "aereo",
      fornecedor: servico.fornecedor || "",
      descricao: servico.descricao || "",
      status: servico.status || "ativo",
      data_inicio: servico.data_inicio || "",
      data_fim: servico.data_fim || "",
      valor: servico.valor !== null && servico.valor !== undefined ? String(servico.valor) : "",
      moeda: servico.moeda || "BRL",
      voucher_url: servico.voucher_url || "",
      observacoes: servico.observacoes || "",
    });
  }

  function resetServico() {
    setEditServicoId(null);
    setServicoForm(emptyServico);
  }

  async function salvarServico() {
    if (!viagem || !viagem.company_id) {
      setErro("Viagem sem company_id para salvar serviço.");
      return;
    }
    try {
      setSavingServico(true);
      setErro(null);
      const payload: any = {
        viagem_id: viagem.id,
        company_id: viagem.company_id,
        tipo: servicoForm.tipo || "outro",
        fornecedor: servicoForm.fornecedor || null,
        descricao: servicoForm.descricao || null,
        status: servicoForm.status || null,
        data_inicio: servicoForm.data_inicio || null,
        data_fim: servicoForm.data_fim || null,
        valor: servicoForm.valor ? Number(servicoForm.valor) : null,
        moeda: servicoForm.moeda || "BRL",
        voucher_url: servicoForm.voucher_url || null,
        observacoes: servicoForm.observacoes || null,
      };

      if (editServicoId) {
        const { error } = await supabase
          .from("viagem_servicos")
          .update(payload)
          .eq("id", editServicoId)
          .eq("viagem_id", viagem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("viagem_servicos").insert(payload);
        if (error) throw error;
      }

      resetServico();
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar serviço.");
    } finally {
      setSavingServico(false);
    }
  }

  async function removerServico(id: string) {
    if (!podeExcluir) return;
    try {
      setRemovendoServicoId(id);
      setErro(null);
      const { error } = await supabase
        .from("viagem_servicos")
        .delete()
        .eq("id", id)
        .eq("viagem_id", viagemId);
      if (error) throw error;
      if (editServicoId === id) resetServico();
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao remover serviço.");
    } finally {
      setRemovendoServicoId(null);
    }
  }

  async function salvarDocumento() {
    if (!viagem || !viagem.company_id) {
      setErro("Viagem sem company_id para salvar documento.");
      return;
    }
    if (!docFile) {
      setErro("Selecione um arquivo para enviar.");
      return;
    }
    if (!docTitulo.trim()) {
      setErro("Informe um título para o documento.");
      return;
    }
    try {
      setSavingDoc(true);
      setErro(null);
      const safeName = sanitizeFileName(docFile.name);
      const path = `${viagem.id}/${Date.now()}-${safeName}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, docFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: docFile.type || undefined,
          metadata: { mimetype: docFile.type || "application/octet-stream" },
        });
      if (uploadErr) throw uploadErr;
      const publicUrl =
        supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path).data.publicUrl;

      const payload = {
        viagem_id: viagem.id,
        company_id: viagem.company_id,
        titulo: docTitulo,
        tipo: docTipo || "outro",
        url: publicUrl,
        mime_type: docFile.type || null,
        size_bytes: docFile.size || null,
      };
      const { error } = await supabase.from("viagem_documentos").insert(payload);
      if (error) throw error;

      setDocTitulo("");
      setDocTipo("voucher");
      setDocFile(null);
      await carregar();
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error
          ? e.message
          : "Erro ao salvar documento. Verifique se o bucket de Storage existe e é público.";
      setErro(message);
    } finally {
      setSavingDoc(false);
    }
  }

  async function removerDocumento(id: string) {
    if (!podeExcluir) return;
    try {
      setRemovendoDocId(id);
      setErro(null);
      const { error } = await supabase
        .from("viagem_documentos")
        .delete()
        .eq("id", id)
        .eq("viagem_id", viagemId);
      if (error) throw error;
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao remover documento.");
    } finally {
      setRemovendoDocId(null);
    }
  }

  return (
    <div className="card-base card-purple">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn btn-light" href="/operacao/viagens">
            Voltar
          </a>
          <button className="btn btn-primary" type="button" onClick={carregar} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {erro && <div style={{ color: "red", marginTop: 10 }}>{erro}</div>}

      {!erro && viagem && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
          <div className="card-base" style={{ border: "1px solid #e2e8f0" }}>
            <h3 style={{ marginBottom: 8 }}>Dados da viagem</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Origem</label>
                <div>{viagem.origem || "-"}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Destino</label>
                <div>{viagem.destino || "-"}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <div>{viagem.status || "-"}</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data início</label>
                <div>{formatarDataParaExibicao(viagem.data_inicio)}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Data fim</label>
                <div>{formatarDataParaExibicao(viagem.data_fim)}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Responsável</label>
                <div>{viagem.responsavel?.nome_completo || viagem.responsavel_user_id || "-"}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <div>{viagem.observacoes || "-"}</div>
            </div>
          </div>

          <div className="card-base" style={{ border: "1px solid #e2e8f0" }}>
            <h3 style={{ marginBottom: 8 }}>
              Acompanhantes ({viagem.viagem_acompanhantes?.length || 0})
            </h3>

            {podeCriar && (
              <div
                className="card-base"
                style={{ marginBottom: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Vincular acompanhante existente</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Acompanhante</label>
                    <select
                      className="form-select"
                      value={novoAcomp.acompanhante_id}
                      onChange={(e) => setNovoAcomp((prev) => ({ ...prev, acompanhante_id: e.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {acompanhantesCliente.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome_completo}
                          {a.cpf ? ` • ${a.cpf}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Papel</label>
                    <select
                      className="form-select"
                      value={novoAcomp.papel}
                      onChange={(e) => setNovoAcomp((prev) => ({ ...prev, papel: e.target.value }))}
                    >
                      <option value="passageiro">Passageiro</option>
                      <option value="responsavel">Responsável</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Documento URL</label>
                    <input
                      type="url"
                      className="form-input"
                      value={novoAcomp.documento_url}
                      onChange={(e) => setNovoAcomp((prev) => ({ ...prev, documento_url: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea
                    className="form-textarea"
                    value={novoAcomp.observacoes}
                    onChange={(e) => setNovoAcomp((prev) => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>
                <button className="btn btn-primary" type="button" onClick={adicionarAcompanhante} disabled={savingAcomp}>
                  {savingAcomp ? "Salvando..." : "Vincular acompanhante"}
                </button>
              </div>
            )}

            <div className="table-container overflow-x-auto">
              <table className="table-default min-w-[620px]">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th>Parentesco</th>
                    <th>Papel</th>
                    <th>Documento</th>
                    {podeExcluir && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {(viagem.viagem_acompanhantes || []).length === 0 && (
                    <tr>
                      <td colSpan={podeExcluir ? 7 : 6}>Nenhum acompanhante vinculado.</td>
                    </tr>
                  )}
                  {(viagem.viagem_acompanhantes || []).map((a) => (
                    <tr key={a.id}>
                      <td>{a.cliente_acompanhantes?.nome_completo || "-"}</td>
                      <td>{a.cliente_acompanhantes?.cpf || "-"}</td>
                      <td>{a.cliente_acompanhantes?.telefone || "-"}</td>
                      <td>{a.cliente_acompanhantes?.grau_parentesco || "-"}</td>
                      <td>{a.papel || "-"}</td>
                      <td>
                        {a.documento_url ? (
                          <a className="btn btn-light" href={a.documento_url} target="_blank" rel="noreferrer">
                            Abrir
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      {podeExcluir && (
                        <td>
                          <button
                            className="btn btn-light"
                            type="button"
                            onClick={() => removerAcompanhante(a.id)}
                            disabled={savingAcomp}
                          >
                            Remover
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-base" style={{ border: "1px solid #e2e8f0" }}>
            <h3 style={{ marginBottom: 8 }}>Serviços da viagem ({servicos.length})</h3>

            {podeCriar && (
              <div
                className="card-base"
                style={{ marginBottom: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {editServicoId ? "Editar serviço" : "Adicionar serviço"}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={servicoForm.tipo}
                      onChange={(e) => setServicoForm((prev) => ({ ...prev, tipo: e.target.value }))}
                    >
                      <option value="aereo">Aéreo</option>
                      <option value="hotel">Hotel</option>
                      <option value="terrestre">Terrestre</option>
                      <option value="seguro">Seguro</option>
                      <option value="passeio">Passeio</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fornecedor</label>
                    <input
                      className="form-input"
                      value={servicoForm.fornecedor}
                      onChange={(e) => setServicoForm((prev) => ({ ...prev, fornecedor: e.target.value }))}
                      placeholder="Nome do fornecedor"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={servicoForm.status}
                      onChange={(e) => setServicoForm((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="pendente">Pendente</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Voucher URL</label>
                    <input
                      className="form-input"
                      value={servicoForm.voucher_url}
                      onChange={(e) => setServicoForm((prev) => ({ ...prev, voucher_url: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Data início</label>
                    <input
                      type="date"
                      className="form-input"
                      value={servicoForm.data_inicio}
                      onChange={(e) => setServicoForm((prev) => ({ ...prev, data_inicio: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data fim</label>
                    <input
                      type="date"
                      className="form-input"
                      value={servicoForm.data_fim}
                      onChange={(e) => setServicoForm((prev) => ({ ...prev, data_fim: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={servicoForm.valor}
                      onChange={(e) => setServicoForm((prev) => ({ ...prev, valor: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Moeda</label>
                    <input
                      className="form-input"
                      value={servicoForm.moeda}
                      onChange={(e) => setServicoForm((prev) => ({ ...prev, moeda: e.target.value }))}
                      placeholder="BRL"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <input
                    className="form-input"
                    value={servicoForm.descricao}
                    onChange={(e) => setServicoForm((prev) => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição resumida do serviço"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea
                    className="form-textarea"
                    value={servicoForm.observacoes}
                    onChange={(e) => setServicoForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" type="button" onClick={salvarServico} disabled={savingServico}>
                    {savingServico ? "Salvando..." : editServicoId ? "Salvar alterações" : "Adicionar serviço"}
                  </button>
                  {editServicoId && (
                    <button className="btn btn-light" type="button" onClick={resetServico} disabled={savingServico}>
                      Cancelar edição
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="table-container overflow-x-auto">
              <table className="table-default min-w-[720px]">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Fornecedor</th>
                    <th>Descrição</th>
                    <th>Período</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Voucher</th>
                    {podeExcluir && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {servicos.length === 0 && (
                    <tr>
                      <td colSpan={podeExcluir ? 8 : 7}>Nenhum serviço cadastrado.</td>
                    </tr>
                  )}
                  {servicos.map((s) => (
                    <tr key={s.id}>
                      <td>{s.tipo || "-"}</td>
                      <td>{s.fornecedor || "-"}</td>
                      <td>{s.descricao || "-"}</td>
                      <td>
                        {`${formatarDataParaExibicao(s.data_inicio)} / ${formatarDataParaExibicao(
                          s.data_fim
                        )}`}
                      </td>
                      <td>
                        {s.valor !== null && s.valor !== undefined
                          ? Number(s.valor).toLocaleString("pt-BR", { style: "currency", currency: s.moeda || "BRL" })
                          : "-"}
                      </td>
                      <td>{s.status || "-"}</td>
                      <td>
                        {s.voucher_url ? (
                          <a className="btn btn-light" href={s.voucher_url} target="_blank" rel="noreferrer">
                            Abrir
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      {podeExcluir && (
                        <td style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-light" type="button" onClick={() => iniciarEdicaoServico(s)}>
                            Editar
                          </button>
                          <button
                            className="btn btn-light"
                            type="button"
                            onClick={() => removerServico(s.id)}
                            disabled={removendoServicoId === s.id}
                          >
                            {removendoServicoId === s.id ? "Removendo..." : "Remover"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-base border border-slate-200">
            <h3 className="mb-2">Documentos / vouchers ({documentos.length})</h3>
            {podeCriar && (
              <div className="card-base mb-3 border border-dashed border-slate-300 bg-slate-50">
                <div className="font-semibold mb-2">Enviar documento</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Título</label>
                    <input
                      className="form-input"
                      value={docTitulo}
                      onChange={(e) => setDocTitulo(e.target.value)}
                      placeholder="Ex: Voucher do hotel"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={docTipo}
                      onChange={(e) => setDocTipo(e.target.value)}
                    >
                      <option value="voucher">Voucher</option>
                      <option value="bilhete">Bilhete</option>
                      <option value="roteiro">Roteiro</option>
                      <option value="seguro">Seguro</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Arquivo</label>
                    <input
                      type="file"
                      className="form-input"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <button className="btn btn-primary" type="button" onClick={salvarDocumento} disabled={savingDoc}>
                  {savingDoc ? "Enviando..." : "Enviar documento"}
                </button>
                <div className="text-xs text-slate-500 mt-2">
                  Bucket sugerido: {STORAGE_BUCKET} (público ou via URL assinada).
                </div>
              </div>
            )}

            <div className="table-container overflow-x-auto">
              <table className="table-default min-w-[640px]">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Arquivo</th>
                    <th>Tamanho</th>
                    <th>Criado em</th>
                    {podeExcluir && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {documentos.length === 0 && (
                    <tr>
                      <td colSpan={podeExcluir ? 6 : 5}>Nenhum documento.</td>
                    </tr>
                  )}
                  {documentos.map((d) => (
                    <tr key={d.id}>
                      <td>{d.titulo || "-"}</td>
                      <td>{d.tipo || "-"}</td>
                      <td>
                        {d.url ? (
                          <a className="btn btn-light" href={d.url} target="_blank" rel="noreferrer">
                            Abrir
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {d.size_bytes
                          ? `${(Number(d.size_bytes) / 1024).toFixed(1)} KB`
                          : "-"}
                      </td>
                      <td>{formatarDataParaExibicao(d.created_at)}</td>
                      {podeExcluir && (
                        <td>
                          <button
                            className="btn btn-light"
                            type="button"
                            onClick={() => removerDocumento(d.id)}
                            disabled={removendoDocId === d.id}
                          >
                            {removendoDocId === d.id ? "Removendo..." : "Remover"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!erro && !viagem && !loading && (
        <div style={{ marginTop: 12 }}>Viagem não encontrada ou sem permissão.</div>
      )}
    </div>
  );
}
