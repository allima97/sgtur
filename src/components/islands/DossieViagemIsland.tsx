import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { formatarDataParaExibicao } from "../../lib/formatDate";
import { parentescoOptions } from "../../lib/parentescoOptions";

type ViagemAcompanhante = {
  id: string;
  acompanhante_id?: string | null;
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

type ReciboVenda = {
  id: string;
  numero_recibo?: string | null;
  valor_total: number | null;
  valor_taxas: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  produto_id: string | null;
  produto_resolvido_id?: string | null;
  tipo_produtos?: { id: string; nome?: string | null; tipo?: string | null } | null;
  produto_resolvido?: { id: string; nome?: string | null } | null;
};

type ViagemResumo = {
  id: string;
  recibo_id?: string | null;
  origem: string | null;
  destino: string | null;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
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
  venda?: {
    id: string;
    cliente_id: string | null;
    clientes?: { nome?: string | null } | null;
    destino_id?: string | null;
    vendas_recibos?: ReciboVenda[] | null;
  } | null;
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

function parseStorageRef(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("storage://")) {
    const rest = url.slice("storage://".length);
    const [bucket, ...pathParts] = rest.split("/");
    if (!bucket || pathParts.length === 0) return null;
    return { bucket, path: pathParts.join("/") };
  }
  const signedMatch = url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/i);
  if (signedMatch) {
    return { bucket: signedMatch[1], path: decodeURIComponent(signedMatch[2]) };
  }
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (publicMatch) {
    return { bucket: publicMatch[1], path: decodeURIComponent(publicMatch[2]) };
  }
  if (!url.includes("://")) {
    return { bucket: STORAGE_BUCKET, path: url };
  }
  return null;
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
  const [abrindoDocId, setAbrindoDocId] = useState<string | null>(null);
  const [viagensVenda, setViagensVenda] = useState<ViagemResumo[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<"dados" | "acompanhantes" | "servicos" | "documentos">("dados");
  const [mostrarCadastroAcomp, setMostrarCadastroAcomp] = useState(false);
  const [mostrarVinculoAcomp, setMostrarVinculoAcomp] = useState(false);
  const [editAcompId, setEditAcompId] = useState<string | null>(null);
  const [mostrarServicoForm, setMostrarServicoForm] = useState(false);
  const [mostrarDocumentoForm, setMostrarDocumentoForm] = useState(false);
  const [salvandoCadastroAcomp, setSalvandoCadastroAcomp] = useState(false);
  const [erroCadastroAcomp, setErroCadastroAcomp] = useState<string | null>(null);
  const [cadastroAcompForm, setCadastroAcompForm] = useState({
    nome_completo: "",
    cpf: "",
    telefone: "",
    grau_parentesco: "",
    rg: "",
    data_nascimento: "",
    observacoes: "",
    ativo: true,
  });

  const servicos = viagem?.viagem_servicos || [];
  const documentos = viagem?.viagem_documentos || [];
  const recibos = viagem?.venda?.vendas_recibos || [];
  const clienteNome = viagem?.venda?.clientes?.nome || "";
  const clienteBaseId = viagem?.venda?.cliente_id || null;
  const reciboPrincipal = React.useMemo(() => {
    const destinoId = viagem?.venda?.destino_id;
    if (!destinoId) return recibos[0] || null;
    return (
      recibos.find(
        (r) =>
          r.produto_resolvido_id === destinoId ||
          r.produto_id === destinoId ||
          r.tipo_produtos?.id === destinoId
      ) ||
      recibos[0] ||
      null
    );
  }, [recibos, viagem?.venda?.destino_id]);
  const recibosOrdenados = React.useMemo(() => {
    if (!reciboPrincipal) return recibos;
    const restantes = recibos.filter((r) => r.id !== reciboPrincipal.id);
    return [reciboPrincipal, ...restantes];
  }, [recibos, reciboPrincipal]);
  const viagemPrincipalDados = React.useMemo(() => {
    if (!reciboPrincipal) return null;
    return viagensVenda.find((v) => v.recibo_id === reciboPrincipal.id) || null;
  }, [viagensVenda, reciboPrincipal]);
  const dadosViagem = viagemPrincipalDados || viagem;

  function resetCadastroAcompanhante(hideForm = false) {
    setCadastroAcompForm({
      nome_completo: "",
      cpf: "",
      telefone: "",
      grau_parentesco: "",
      rg: "",
      data_nascimento: "",
      observacoes: "",
      ativo: true,
    });
    setErroCadastroAcomp(null);
    if (hideForm) {
      setMostrarCadastroAcomp(false);
    }
  }

  function resetVinculoAcompanhante(hideForm = false) {
    setNovoAcomp({ acompanhante_id: "", papel: "passageiro", documento_url: "", observacoes: "" });
    setEditAcompId(null);
    if (hideForm) {
      setMostrarVinculoAcomp(false);
    }
  }

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
            destino_id,
            clientes:clientes (
              id,
              nome
            ),
            vendas_recibos (
              id,
              numero_recibo,
              valor_total,
              valor_taxas,
              data_inicio,
              data_fim,
              produto_id,
              produto_resolvido_id,
              tipo_produtos (
                id,
                nome,
                tipo
              ),
              produto_resolvido:produtos!produto_resolvido_id (
                id,
                nome
              )
            )
          ),
          viagem_acompanhantes (
            id,
            acompanhante_id,
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
      if (detalhe?.venda_id) {
        const { data: viagensData, error: viagensErr } = await supabase
          .from("viagens")
          .select("id, recibo_id, origem, destino, status, data_inicio, data_fim, observacoes")
          .eq("venda_id", detalhe.venda_id);
        if (viagensErr) throw viagensErr;
        setViagensVenda((viagensData || []) as ViagemResumo[]);
      } else {
        setViagensVenda([]);
      }

      // Carrega acompanhantes do cliente base (venda).
      const clienteBaseId =
        (detalhe?.venda?.cliente_id as string | null) ||
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
      setViagensVenda([]);
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

  function iniciarEdicaoAcompanhante(acomp: ViagemAcompanhante) {
    setEditAcompId(acomp.id);
    setNovoAcomp({
      acompanhante_id: acomp.acompanhante_id || "",
      papel: acomp.papel || "passageiro",
      documento_url: acomp.documento_url || "",
      observacoes: acomp.observacoes || "",
    });
    setMostrarVinculoAcomp(true);
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
      const { error } = editAcompId
        ? await supabase
            .from("viagem_acompanhantes")
            .update(payload)
            .eq("id", editAcompId)
            .eq("viagem_id", viagem.id)
        : await supabase.from("viagem_acompanhantes").insert(payload);
      if (error) throw error;
      // reload
      resetVinculoAcompanhante(true);
      await carregar();
    } catch (e) {
      console.error(e);
      setErro(editAcompId ? "Erro ao atualizar acompanhante." : "Erro ao adicionar acompanhante.");
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
      if (editAcompId === id) {
        resetVinculoAcompanhante(true);
      }
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao remover acompanhante.");
    } finally {
      setSavingAcomp(false);
    }
  }

  async function salvarCadastroAcompanhante() {
    if (!viagem || !podeCriar) return;
    if (!clienteBaseId) {
      setErroCadastroAcomp("Cliente não identificado para este dossiê.");
      return;
    }
    if (!viagem.company_id) {
      setErroCadastroAcomp("Viagem sem company_id para salvar acompanhante.");
      return;
    }
    if (!cadastroAcompForm.nome_completo.trim()) {
      setErroCadastroAcomp("Informe o nome completo do acompanhante.");
      return;
    }
    try {
      setSalvandoCadastroAcomp(true);
      setErroCadastroAcomp(null);
      const payload = {
        cliente_id: clienteBaseId,
        company_id: viagem.company_id,
        nome_completo: cadastroAcompForm.nome_completo.trim(),
        cpf: cadastroAcompForm.cpf?.trim() || null,
        telefone: cadastroAcompForm.telefone?.trim() || null,
        grau_parentesco: cadastroAcompForm.grau_parentesco?.trim() || null,
        rg: cadastroAcompForm.rg?.trim() || null,
        data_nascimento: cadastroAcompForm.data_nascimento || null,
        observacoes: cadastroAcompForm.observacoes?.trim() || null,
        ativo: cadastroAcompForm.ativo,
      };
      const { data, error } = await supabase
        .from("cliente_acompanhantes")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      resetCadastroAcompanhante(true);
      if (data?.id) {
        setNovoAcomp((prev) => ({ ...prev, acompanhante_id: data.id }));
      }
      await carregar();
    } catch (e) {
      console.error(e);
      setErroCadastroAcomp("Erro ao cadastrar acompanhante.");
    } finally {
      setSalvandoCadastroAcomp(false);
    }
  }

  function iniciarEdicaoServico(servico: ViagemServico) {
    setMostrarServicoForm(true);
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
      const storageRef = `storage://${STORAGE_BUCKET}/${uploadData.path}`;

      const payload = {
        viagem_id: viagem.id,
        company_id: viagem.company_id,
        titulo: docTitulo,
        tipo: docTipo || "outro",
        url: storageRef || publicUrl,
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

  async function abrirDocumento(doc: ViagemDocumento) {
    if (!doc.url) return;
    const storageRef = parseStorageRef(doc.url);
    if (!storageRef) {
      window.open(doc.url, "_blank", "noreferrer");
      return;
    }
    try {
      setAbrindoDocId(doc.id);
      setErro(null);
      const { data, error } = await supabase.storage
        .from(storageRef.bucket)
        .createSignedUrl(storageRef.path, 60 * 10);
      if (error || !data?.signedUrl) {
        throw error || new Error("URL assinada indisponível.");
      }
      window.open(data.signedUrl, "_blank", "noreferrer");
    } catch (e) {
      console.error(e);
      setErro("Erro ao abrir documento. Verifique o bucket de Storage.");
    } finally {
      setAbrindoDocId(null);
    }
  }

  return (
    <div className="page-content-wrap dossie-viagem-page">
      <div className="card-base card-purple mb-3 list-toolbar-sticky">
        <div className="mobile-stack-buttons" style={{ justifyContent: "flex-end" }}>
          <a className="btn btn-light w-full sm:w-auto" href="/operacao/viagens">
            Voltar
          </a>
          <button
            className="btn btn-primary w-full sm:w-auto"
            type="button"
            onClick={carregar}
            disabled={loading}
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {erro && <div style={{ color: "red", marginTop: 10 }}>{erro}</div>}

      {!erro && viagem && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-base card-purple">
            <div className="mobile-stack-buttons">
              <button
                type="button"
                className={`btn w-full sm:w-auto ${abaAtiva === "dados" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setAbaAtiva("dados")}
              >
                Dados da viagem
              </button>
              <button
                type="button"
                className={`btn w-full sm:w-auto ${abaAtiva === "acompanhantes" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setAbaAtiva("acompanhantes")}
              >
                Acompanhantes
              </button>
              <button
                type="button"
                className={`btn w-full sm:w-auto ${abaAtiva === "servicos" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setAbaAtiva("servicos")}
              >
                Serviços da viagem
              </button>
              <button
                type="button"
                className={`btn w-full sm:w-auto ${abaAtiva === "documentos" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setAbaAtiva("documentos")}
              >
                Documentos / vouchers
              </button>
            </div>
          </div>

          {abaAtiva === "dados" && (
            <div style={{ display: "grid", gap: 12 }}>
              {clienteNome && (
                <div className="card-base" style={{ border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    <span style={{ color: "#1d4ed8" }}>Cliente:</span> {clienteNome}
                  </div>
                </div>
              )}

              <div className="card-base" style={{ border: "1px solid #e2e8f0" }}>
                <h3 className="text-center sm:text-left" style={{ margin: 0 }}>
                  Dados da viagem
                </h3>
              </div>

              {recibosOrdenados.length === 0 ? (
                <div>-</div>
              ) : (
                <div className="table-container overflow-x-auto">
                  <table className="table-default table-mobile-cards min-w-[720px]">
                    <thead>
                      <tr>
                        <th>Recibo</th>
                        <th>Tipo Produto</th>
                        <th>Produto</th>
                        <th>De</th>
                        <th>Até</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recibosOrdenados.map((r) => {
                        const isPrincipal = reciboPrincipal?.id === r.id;
                        const tipoLabel = r.tipo_produtos?.nome || r.tipo_produtos?.tipo || "-";
                        const produtoNome = r.produto_resolvido?.nome || r.produto_id || "-";
                        const valorTotal =
                          r.valor_total !== null && r.valor_total !== undefined
                            ? Number(r.valor_total).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "-";
                        return (
                          <tr key={r.id}>
                            <td data-label="Recibo">
                              {r.numero_recibo ? `Recibo ${r.numero_recibo}` : "Recibo"}
                              {isPrincipal ? " (Principal)" : ""}
                            </td>
                            <td data-label="Tipo Produto">{tipoLabel || "-"}</td>
                            <td data-label="Produto">{produtoNome || "-"}</td>
                            <td data-label="De">{formatarDataParaExibicao(r.data_inicio)}</td>
                            <td data-label="Até">{formatarDataParaExibicao(r.data_fim)}</td>
                            <td data-label="Valor">{valorTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {abaAtiva === "acompanhantes" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="card-base" style={{ border: "1px solid #e2e8f0" }}>
                <h3 className="text-center sm:text-left" style={{ margin: 0 }}>
                  Acompanhantes ({viagem.viagem_acompanhantes?.length || 0})
                </h3>
              </div>

              {podeCriar && (
                <div
                  className="card-base"
                  style={{ marginBottom: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" }}
                >
                  <div className="mobile-only" style={{ marginBottom: 8 }}>
                    {!mostrarVinculoAcomp && (
                      <button
                        type="button"
                        className="btn btn-primary w-full sm:w-auto"
                        onClick={() =>
                          setMostrarVinculoAcomp((prev) => {
                            if (prev) {
                              resetVinculoAcompanhante();
                            }
                            return !prev;
                          })
                        }
                      >
                        Vincular acompanhante
                      </button>
                    )}
                  </div>
                  <div className="mobile-collapsible" data-open={mostrarVinculoAcomp ? "true" : "false"}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      {editAcompId ? "Editar acompanhante" : "Vincular acompanhante existente"}
                    </div>
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
                    <div className="mobile-stack-buttons">
                      <button
                        className="btn btn-light w-full sm:w-auto"
                        type="button"
                        onClick={adicionarAcompanhante}
                        disabled={savingAcomp}
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          borderColor: "#86efac",
                        }}
                      >
                        {savingAcomp ? "Salvando..." : "Salvar vínculo"}
                      </button>
                      <button
                        className="btn btn-light w-full sm:w-auto"
                        type="button"
                        onClick={() =>
                          setMostrarVinculoAcomp((prev) => {
                            if (prev) {
                              resetVinculoAcompanhante();
                            }
                            return !prev;
                          })
                        }
                        disabled={savingAcomp}
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#b91c1c",
                          borderColor: "#fecaca",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {podeCriar && (
                <div
                  className="card-base"
                  style={{ marginBottom: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" }}
                >
                  <div className="desktop-only" style={{ fontWeight: 600, marginBottom: 8 }}>Cadastrar acompanhante</div>
                  {erroCadastroAcomp && (
                    <div style={{ color: "red", marginBottom: 8 }}>{erroCadastroAcomp}</div>
                  )}
                  {!mostrarCadastroAcomp && (
                    <button
                      type="button"
                      className="btn btn-primary w-full sm:w-auto"
                      onClick={() => {
                        resetCadastroAcompanhante();
                        setMostrarCadastroAcomp(true);
                      }}
                    >
                      Cadastrar acompanhante
                    </button>
                  )}
                  {mostrarCadastroAcomp && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Nome completo</label>
                          <input
                            className="form-input"
                            value={cadastroAcompForm.nome_completo}
                            onChange={(e) =>
                              setCadastroAcompForm((prev) => ({
                                ...prev,
                                nome_completo: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">CPF</label>
                          <input
                            className="form-input"
                            value={cadastroAcompForm.cpf}
                            onChange={(e) =>
                              setCadastroAcompForm((prev) => ({ ...prev, cpf: e.target.value }))
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Telefone</label>
                          <input
                            className="form-input"
                            value={cadastroAcompForm.telefone}
                            onChange={(e) =>
                              setCadastroAcompForm((prev) => ({ ...prev, telefone: e.target.value }))
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Parentesco</label>
                          <select
                            className="form-select"
                            value={cadastroAcompForm.grau_parentesco}
                            onChange={(e) =>
                              setCadastroAcompForm((prev) => ({
                                ...prev,
                                grau_parentesco: e.target.value,
                              }))
                            }
                          >
                            <option value="">Selecione</option>
                            {parentescoOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">RG</label>
                          <input
                            className="form-input"
                            value={cadastroAcompForm.rg}
                            onChange={(e) =>
                              setCadastroAcompForm((prev) => ({ ...prev, rg: e.target.value }))
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Data nascimento</label>
                          <input
                            type="date"
                            className="form-input"
                            value={cadastroAcompForm.data_nascimento}
                            onChange={(e) =>
                              setCadastroAcompForm((prev) => ({
                                ...prev,
                                data_nascimento: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Observações</label>
                          <input
                            className="form-input"
                            value={cadastroAcompForm.observacoes}
                            onChange={(e) =>
                              setCadastroAcompForm((prev) => ({
                                ...prev,
                                observacoes: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="form-group" style={{ alignSelf: "flex-end" }}>
                          <label className="form-label">Ativo</label>
                          <input
                            type="checkbox"
                            checked={cadastroAcompForm.ativo}
                            onChange={(e) =>
                              setCadastroAcompForm((prev) => ({
                                ...prev,
                                ativo: e.target.checked,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="mobile-stack-buttons">
                        <button
                          className="btn btn-light w-full sm:w-auto"
                          type="button"
                          onClick={salvarCadastroAcompanhante}
                          disabled={salvandoCadastroAcomp}
                          style={{
                            backgroundColor: "#dcfce7",
                            color: "#166534",
                            borderColor: "#86efac",
                          }}
                        >
                          {salvandoCadastroAcomp ? "Salvando..." : "Salvar acompanhante"}
                        </button>
                        <button
                          className="btn btn-light w-full sm:w-auto"
                          type="button"
                          onClick={() => resetCadastroAcompanhante(true)}
                          disabled={salvandoCadastroAcomp}
                          style={{
                            backgroundColor: "#fee2e2",
                            color: "#b91c1c",
                            borderColor: "#fecaca",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="table-container overflow-x-auto">
                <table className="table-default table-mobile-cards min-w-[620px]">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>CPF</th>
                      <th>Telefone</th>
                      <th>Parentesco</th>
                      <th>Papel</th>
                      <th>Documento</th>
                      {podeExcluir && <th className="th-actions">Ações</th>}
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
                        <td data-label="Nome">{a.cliente_acompanhantes?.nome_completo || "-"}</td>
                        <td data-label="CPF">{a.cliente_acompanhantes?.cpf || "-"}</td>
                        <td data-label="Telefone">{a.cliente_acompanhantes?.telefone || "-"}</td>
                        <td data-label="Parentesco">{a.cliente_acompanhantes?.grau_parentesco || "-"}</td>
                        <td data-label="Papel">{a.papel || "-"}</td>
                        <td data-label="Documento">
                          {a.documento_url ? (
                            <a className="btn btn-light" href={a.documento_url} target="_blank" rel="noreferrer">
                              Abrir
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        {podeExcluir && (
                          <td className="th-actions" data-label="Ações">
                            <div className="action-buttons">
                              <button
                                className="btn-icon"
                                type="button"
                                title="Editar acompanhante"
                                onClick={() => iniciarEdicaoAcompanhante(a)}
                                disabled={savingAcomp}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn-icon btn-danger"
                                type="button"
                                title="Excluir acompanhante"
                                onClick={() => removerAcompanhante(a.id)}
                                disabled={savingAcomp}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {abaAtiva === "servicos" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="card-base" style={{ border: "1px solid #e2e8f0" }}>
                <h3 className="text-center sm:text-left" style={{ margin: 0 }}>
                  Serviços da viagem ({servicos.length})
                </h3>
              </div>

              {podeCriar && (
                <div
                  className="card-base"
                  style={{ marginBottom: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" }}
                >
                  <div className="mobile-only" style={{ marginBottom: 8 }}>
                    {!mostrarServicoForm && (
                      <button
                        type="button"
                        className="btn btn-primary w-full sm:w-auto"
                        onClick={() => {
                          resetServico();
                          setMostrarServicoForm(true);
                        }}
                      >
                        Adicionar serviço
                      </button>
                    )}
                  </div>
                  <div className="mobile-collapsible" data-open={mostrarServicoForm ? "true" : "false"}>
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
                          className="form-input w-full"
                          value={servicoForm.data_inicio}
                          onChange={(e) =>
                            setServicoForm((prev) => {
                              const nextInicio = e.target.value;
                              const nextFim =
                                prev.data_fim && nextInicio && prev.data_fim < nextInicio
                                  ? nextInicio
                                  : prev.data_fim;
                              return { ...prev, data_inicio: nextInicio, data_fim: nextFim };
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Data fim</label>
                        <input
                          type="date"
                          className="form-input w-full"
                          value={servicoForm.data_fim}
                          min={servicoForm.data_inicio || undefined}
                          onChange={(e) =>
                            setServicoForm((prev) => {
                              const nextFim = e.target.value;
                              const boundedFim =
                                prev.data_inicio && nextFim && nextFim < prev.data_inicio
                                  ? prev.data_inicio
                                  : nextFim;
                              return { ...prev, data_fim: boundedFim };
                            })
                          }
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
                    <div className="mobile-stack-buttons">
                      <button
                        className="btn btn-light w-full sm:w-auto"
                        type="button"
                        onClick={salvarServico}
                        disabled={savingServico}
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          borderColor: "#86efac",
                        }}
                      >
                        {savingServico ? "Salvando..." : editServicoId ? "Salvar alterações" : "Adicionar serviço"}
                      </button>
                      <button
                        className="btn btn-light w-full sm:w-auto"
                        type="button"
                        onClick={() => {
                          resetServico();
                          setMostrarServicoForm(false);
                        }}
                        disabled={savingServico}
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#b91c1c",
                          borderColor: "#fecaca",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="table-container overflow-x-auto">
                <table className="table-default table-mobile-cards min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Fornecedor</th>
                      <th>Descrição</th>
                      <th>Período</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Voucher</th>
                      {podeExcluir && <th className="th-actions">Ações</th>}
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
                        <td data-label="Tipo">{s.tipo || "-"}</td>
                        <td data-label="Fornecedor">{s.fornecedor || "-"}</td>
                        <td data-label="Descrição">{s.descricao || "-"}</td>
                        <td data-label="Período">
                          {`${formatarDataParaExibicao(s.data_inicio)} / ${formatarDataParaExibicao(
                            s.data_fim
                          )}`}
                        </td>
                        <td data-label="Valor">
                          {s.valor !== null && s.valor !== undefined
                            ? Number(s.valor).toLocaleString("pt-BR", { style: "currency", currency: s.moeda || "BRL" })
                            : "-"}
                        </td>
                        <td data-label="Status">{s.status || "-"}</td>
                        <td data-label="Voucher">
                          {s.voucher_url ? (
                            <a className="btn btn-light" href={s.voucher_url} target="_blank" rel="noreferrer">
                              Abrir
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        {podeExcluir && (
                          <td className="th-actions" data-label="Ações">
                            <div className="action-buttons">
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
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {abaAtiva === "documentos" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="card-base" style={{ border: "1px solid #e2e8f0" }}>
                <h3 className="text-center sm:text-left" style={{ margin: 0 }}>
                  Documentos / vouchers ({documentos.length})
                </h3>
              </div>
              {podeCriar && (
                <div className="card-base mb-3 border border-dashed border-slate-300 bg-slate-50">
                  <div className="mobile-only" style={{ marginBottom: 8 }}>
                    {!mostrarDocumentoForm && (
                      <button
                        type="button"
                        className="btn btn-primary w-full sm:w-auto"
                        onClick={() => setMostrarDocumentoForm(true)}
                      >
                        Enviar documento
                      </button>
                    )}
                  </div>
                  <div className="mobile-collapsible" data-open={mostrarDocumentoForm ? "true" : "false"}>
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
                          <option value="passaporte">Passaporte</option>
                          <option value="cpf">CPF</option>
                          <option value="rg">RG</option>
                          <option value="cnh">CNH</option>
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
                    <div className="mobile-stack-buttons">
                      <button
                        className="btn btn-light w-full sm:w-auto"
                        type="button"
                        onClick={salvarDocumento}
                        disabled={savingDoc}
                        style={{
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          borderColor: "#86efac",
                        }}
                      >
                        {savingDoc ? "Enviando..." : "Enviar documento"}
                      </button>
                      <button
                        className="btn btn-light w-full sm:w-auto"
                        type="button"
                        onClick={() => {
                          setDocTitulo("");
                          setDocTipo("voucher");
                          setDocFile(null);
                          setMostrarDocumentoForm(false);
                        }}
                        disabled={savingDoc}
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#b91c1c",
                          borderColor: "#fecaca",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      Bucket sugerido: {STORAGE_BUCKET} (público ou via URL assinada).
                    </div>
                  </div>
                </div>
              )}

              <div className="table-container overflow-x-auto">
                <table className="table-default table-mobile-cards min-w-[640px]">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Arquivo</th>
                      <th>Tamanho</th>
                      <th>Criado em</th>
                      {podeExcluir && <th className="th-actions">Ações</th>}
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
                        <td data-label="Título">{d.titulo || "-"}</td>
                        <td data-label="Tipo">{d.tipo || "-"}</td>
                        <td data-label="Arquivo">
                          {d.url ? (
                            <button
                              className="btn btn-light"
                              type="button"
                              onClick={() => abrirDocumento(d)}
                              disabled={abrindoDocId === d.id}
                            >
                              {abrindoDocId === d.id ? "Abrindo..." : "Abrir"}
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td data-label="Tamanho">
                          {d.size_bytes
                            ? `${(Number(d.size_bytes) / 1024).toFixed(1)} KB`
                            : "-"}
                        </td>
                        <td data-label="Criado em">{formatarDataParaExibicao(d.created_at)}</td>
                        {podeExcluir && (
                          <td className="th-actions" data-label="Ações">
                            <div className="action-buttons">
                              <button
                                className="btn btn-light"
                                type="button"
                                onClick={() => removerDocumento(d.id)}
                                disabled={removendoDocId === d.id}
                              >
                                {removendoDocId === d.id ? "Removendo..." : "Remover"}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!erro && !viagem && !loading && (
        <div style={{ marginTop: 12 }}>Viagem não encontrada ou sem permissão.</div>
      )}
    </div>
  );
}
