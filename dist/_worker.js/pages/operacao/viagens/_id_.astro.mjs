globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as createAstro, e as renderComponent, d as renderTemplate } from '../../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../../chunks/DashboardLayout_DgtdOcH4.mjs';
import { $ as $$HeaderPage } from '../../../chunks/HeaderPage_DCV0c2xr.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../../chunks/systemName_BQeIdnjR.mjs';
import { r as reactExports } from '../../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../../chunks/usePermissao_Cbgi1VF4.mjs';
import { L as LoadingUsuarioContext } from '../../../chunks/LoadingUsuarioContext_C1Z8rvHv.mjs';

const STORAGE_BUCKET = "viagens";
function DossieViagemIsland({ viagemId }) {
  const { permissao, loading: loadingPerm, ativo } = usePermissao("Operacao");
  const podeVer = permissao !== "none";
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir = permissao === "delete" || permissao === "admin";
  const [viagem, setViagem] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [acompanhantesCliente, setAcompanhantesCliente] = reactExports.useState([]);
  const [novoAcomp, setNovoAcomp] = reactExports.useState({
    acompanhante_id: "",
    papel: "passageiro",
    documento_url: "",
    observacoes: ""
  });
  const [savingAcomp, setSavingAcomp] = reactExports.useState(false);
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
    observacoes: ""
  };
  const [servicoForm, setServicoForm] = reactExports.useState(emptyServico);
  const [editServicoId, setEditServicoId] = reactExports.useState(null);
  const [savingServico, setSavingServico] = reactExports.useState(false);
  const [removendoServicoId, setRemovendoServicoId] = reactExports.useState(null);
  const [docTitulo, setDocTitulo] = reactExports.useState("");
  const [docTipo, setDocTipo] = reactExports.useState("voucher");
  const [docFile, setDocFile] = reactExports.useState(null);
  const [savingDoc, setSavingDoc] = reactExports.useState(false);
  const [removendoDocId, setRemovendoDocId] = reactExports.useState(null);
  const servicos = viagem?.viagem_servicos || [];
  const documentos = viagem?.viagem_documentos || [];
  reactExports.useEffect(() => {
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
      const { data, error } = await supabase.from("viagens").select(
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
      ).eq("id", viagemId).maybeSingle();
      if (error) throw error;
      const detalhe = data || null;
      setViagem(detalhe);
      const clienteBaseId = detalhe?.venda?.cliente_id || detalhe?.orcamento?.cliente_id || null;
      if (clienteBaseId) {
        const { data: acompDisp, error: acompErr } = await supabase.from("cliente_acompanhantes").select("id, nome_completo, cpf, telefone, grau_parentesco").eq("cliente_id", clienteBaseId).eq("ativo", true).order("nome_completo", { ascending: true });
        if (!acompErr && acompDisp) {
          setAcompanhantesCliente(
            acompDisp.map((a) => ({
              id: a.id,
              nome_completo: a.nome_completo,
              cpf: a.cpf,
              telefone: a.telefone,
              grau_parentesco: a.grau_parentesco
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
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Operação/Viagens." });
  }
  if (!viagemId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Nenhuma viagem selecionada." });
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
        observacoes: novoAcomp.observacoes || null
      };
      const { error } = await supabase.from("viagem_acompanhantes").insert(payload);
      if (error) throw error;
      setNovoAcomp({ acompanhante_id: "", papel: "passageiro", documento_url: "", observacoes: "" });
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao adicionar acompanhante.");
    } finally {
      setSavingAcomp(false);
    }
  }
  async function removerAcompanhante(id) {
    if (!podeExcluir) return;
    try {
      setSavingAcomp(true);
      setErro(null);
      const { error } = await supabase.from("viagem_acompanhantes").delete().eq("id", id).eq("viagem_id", viagemId);
      if (error) throw error;
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao remover acompanhante.");
    } finally {
      setSavingAcomp(false);
    }
  }
  function iniciarEdicaoServico(servico) {
    setEditServicoId(servico.id);
    setServicoForm({
      tipo: servico.tipo || "aereo",
      fornecedor: servico.fornecedor || "",
      descricao: servico.descricao || "",
      status: servico.status || "ativo",
      data_inicio: servico.data_inicio || "",
      data_fim: servico.data_fim || "",
      valor: servico.valor !== null && servico.valor !== void 0 ? String(servico.valor) : "",
      moeda: servico.moeda || "BRL",
      voucher_url: servico.voucher_url || "",
      observacoes: servico.observacoes || ""
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
      const payload = {
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
        observacoes: servicoForm.observacoes || null
      };
      if (editServicoId) {
        const { error } = await supabase.from("viagem_servicos").update(payload).eq("id", editServicoId).eq("viagem_id", viagem.id);
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
  async function removerServico(id) {
    if (!podeExcluir) return;
    try {
      setRemovendoServicoId(id);
      setErro(null);
      const { error } = await supabase.from("viagem_servicos").delete().eq("id", id).eq("viagem_id", viagemId);
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
      const path = `${viagem.id}/${Date.now()}-${docFile.name}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, docFile, {
        upsert: false
      });
      if (uploadErr) throw uploadErr;
      const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path).data.publicUrl;
      const payload = {
        viagem_id: viagem.id,
        company_id: viagem.company_id,
        titulo: docTitulo,
        tipo: docTipo || "outro",
        url: publicUrl,
        mime_type: docFile.type || null,
        size_bytes: docFile.size || null
      };
      const { error } = await supabase.from("viagem_documentos").insert(payload);
      if (error) throw error;
      setDocTitulo("");
      setDocTipo("voucher");
      setDocFile(null);
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar documento. Verifique se o bucket de Storage existe e é público.");
    } finally {
      setSavingDoc(false);
    }
  }
  async function removerDocumento(id) {
    if (!podeExcluir) return;
    try {
      setRemovendoDocId(id);
      setErro(null);
      const { error } = await supabase.from("viagem_documentos").delete().eq("id", id).eq("viagem_id", viagemId);
      if (error) throw error;
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao remover documento.");
    } finally {
      setRemovendoDocId(null);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 14, color: "#94a3b8" }, children: "ID" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: viagemId })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "btn btn-light", href: "/operacao/viagens", children: "Voltar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "button", onClick: carregar, disabled: loading, children: loading ? "Atualizando..." : "Atualizar" })
      ] })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "red", marginTop: 10 }, children: erro }),
    !erro && viagem && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { border: "1px solid #e2e8f0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 8 }, children: "Dados da viagem" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Origem" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: viagem.origem || "-" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destino" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: viagem.destino || "-" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: viagem.status || "-" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: viagem.data_inicio ? new Date(viagem.data_inicio).toLocaleDateString("pt-BR") : "-" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data fim" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: viagem.data_fim ? new Date(viagem.data_fim).toLocaleDateString("pt-BR") : "-" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Responsável" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: viagem.responsavel_user_id || "-" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Observações" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: viagem.observacoes || "-" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { border: "1px solid #e2e8f0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { style: { marginBottom: 8 }, children: [
          "Acompanhantes (",
          viagem.viagem_acompanhantes?.length || 0,
          ")"
        ] }),
        podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "card-base",
            style: { marginBottom: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600, marginBottom: 8 }, children: "Vincular acompanhante existente" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Acompanhante" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "form-select",
                      value: novoAcomp.acompanhante_id,
                      onChange: (e) => setNovoAcomp((prev) => ({ ...prev, acompanhante_id: e.target.value })),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                        acompanhantesCliente.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: a.id, children: [
                          a.nome_completo,
                          a.cpf ? ` • ${a.cpf}` : ""
                        ] }, a.id))
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Papel" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "form-select",
                      value: novoAcomp.papel,
                      onChange: (e) => setNovoAcomp((prev) => ({ ...prev, papel: e.target.value })),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "passageiro", children: "Passageiro" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "responsavel", children: "Responsável" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Documento URL" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "url",
                      className: "form-input",
                      value: novoAcomp.documento_url,
                      onChange: (e) => setNovoAcomp((prev) => ({ ...prev, documento_url: e.target.value })),
                      placeholder: "https://"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Observações" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "textarea",
                  {
                    className: "form-textarea",
                    value: novoAcomp.observacoes,
                    onChange: (e) => setNovoAcomp((prev) => ({ ...prev, observacoes: e.target.value }))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "button", onClick: adicionarAcompanhante, disabled: savingAcomp, children: savingAcomp ? "Salvando..." : "Vincular acompanhante" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default min-w-[620px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CPF" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Telefone" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Parentesco" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Papel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Documento" }),
            podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            (viagem.viagem_acompanhantes || []).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: podeExcluir ? 7 : 6, children: "Nenhum acompanhante vinculado." }) }),
            (viagem.viagem_acompanhantes || []).map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.cliente_acompanhantes?.nome_completo || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.cliente_acompanhantes?.cpf || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.cliente_acompanhantes?.telefone || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.cliente_acompanhantes?.grau_parentesco || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.papel || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.documento_url ? /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "btn btn-light", href: a.documento_url, target: "_blank", rel: "noreferrer", children: "Abrir" }) : "-" }),
              podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn btn-light",
                  type: "button",
                  onClick: () => removerAcompanhante(a.id),
                  disabled: savingAcomp,
                  children: "Remover"
                }
              ) })
            ] }, a.id))
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { border: "1px solid #e2e8f0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { style: { marginBottom: 8 }, children: [
          "Serviços da viagem (",
          servicos.length,
          ")"
        ] }),
        podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "card-base",
            style: { marginBottom: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600, marginBottom: 8 }, children: editServicoId ? "Editar serviço" : "Adicionar serviço" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "form-select",
                      value: servicoForm.tipo,
                      onChange: (e) => setServicoForm((prev) => ({ ...prev, tipo: e.target.value })),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "aereo", children: "Aéreo" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "hotel", children: "Hotel" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "terrestre", children: "Terrestre" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "seguro", children: "Seguro" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "passeio", children: "Passeio" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "outro", children: "Outro" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Fornecedor" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      className: "form-input",
                      value: servicoForm.fornecedor,
                      onChange: (e) => setServicoForm((prev) => ({ ...prev, fornecedor: e.target.value })),
                      placeholder: "Nome do fornecedor"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Status" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "form-select",
                      value: servicoForm.status,
                      onChange: (e) => setServicoForm((prev) => ({ ...prev, status: e.target.value })),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ativo", children: "Ativo" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pendente", children: "Pendente" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cancelado", children: "Cancelado" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "concluido", children: "Concluído" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Voucher URL" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      className: "form-input",
                      value: servicoForm.voucher_url,
                      onChange: (e) => setServicoForm((prev) => ({ ...prev, voucher_url: e.target.value })),
                      placeholder: "https://"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "date",
                      className: "form-input",
                      value: servicoForm.data_inicio,
                      onChange: (e) => setServicoForm((prev) => ({ ...prev, data_inicio: e.target.value }))
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data fim" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "date",
                      className: "form-input",
                      value: servicoForm.data_fim,
                      onChange: (e) => setServicoForm((prev) => ({ ...prev, data_fim: e.target.value }))
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "number",
                      step: "0.01",
                      className: "form-input",
                      value: servicoForm.valor,
                      onChange: (e) => setServicoForm((prev) => ({ ...prev, valor: e.target.value })),
                      placeholder: "0,00"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Moeda" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      className: "form-input",
                      value: servicoForm.moeda,
                      onChange: (e) => setServicoForm((prev) => ({ ...prev, moeda: e.target.value })),
                      placeholder: "BRL"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Descrição" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: servicoForm.descricao,
                    onChange: (e) => setServicoForm((prev) => ({ ...prev, descricao: e.target.value })),
                    placeholder: "Descrição resumida do serviço"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Observações" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "textarea",
                  {
                    className: "form-textarea",
                    value: servicoForm.observacoes,
                    onChange: (e) => setServicoForm((prev) => ({ ...prev, observacoes: e.target.value }))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "button", onClick: salvarServico, disabled: savingServico, children: savingServico ? "Salvando..." : editServicoId ? "Salvar alterações" : "Adicionar serviço" }),
                editServicoId && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-light", type: "button", onClick: resetServico, disabled: savingServico, children: "Cancelar edição" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default min-w-[720px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Fornecedor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Descrição" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Período" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Voucher" }),
            podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            servicos.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: podeExcluir ? 8 : 7, children: "Nenhum serviço cadastrado." }) }),
            servicos.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.tipo || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.fornecedor || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.descricao || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: (s.data_inicio ? new Date(s.data_inicio).toLocaleDateString("pt-BR") : "-") + " / " + (s.data_fim ? new Date(s.data_fim).toLocaleDateString("pt-BR") : "-") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.valor !== null && s.valor !== void 0 ? Number(s.valor).toLocaleString("pt-BR", { style: "currency", currency: s.moeda || "BRL" }) : "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.status || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.voucher_url ? /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "btn btn-light", href: s.voucher_url, target: "_blank", rel: "noreferrer", children: "Abrir" }) : "-" }),
              podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { display: "flex", gap: 6 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-light", type: "button", onClick: () => iniciarEdicaoServico(s), children: "Editar" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: "btn btn-light",
                    type: "button",
                    onClick: () => removerServico(s.id),
                    disabled: removendoServicoId === s.id,
                    children: removendoServicoId === s.id ? "Removendo..." : "Remover"
                  }
                )
              ] })
            ] }, s.id))
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base border border-slate-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mb-2", children: [
          "Documentos / vouchers (",
          documentos.length,
          ")"
        ] }),
        podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base mb-3 border border-dashed border-slate-300 bg-slate-50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold mb-2", children: "Enviar documento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Título" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  value: docTitulo,
                  onChange: (e) => setDocTitulo(e.target.value),
                  placeholder: "Ex: Voucher do hotel"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: docTipo,
                  onChange: (e) => setDocTipo(e.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "voucher", children: "Voucher" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bilhete", children: "Bilhete" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "roteiro", children: "Roteiro" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "seguro", children: "Seguro" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "outro", children: "Outro" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Arquivo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "file",
                  className: "form-input",
                  onChange: (e) => setDocFile(e.target.files?.[0] || null)
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "button", onClick: salvarDocumento, disabled: savingDoc, children: savingDoc ? "Enviando..." : "Enviar documento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-slate-500 mt-2", children: [
            "Bucket sugerido: ",
            STORAGE_BUCKET,
            " (público ou via URL assinada)."
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default min-w-[640px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Título" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Arquivo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tamanho" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
            podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            documentos.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: podeExcluir ? 6 : 5, children: "Nenhum documento." }) }),
            documentos.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.titulo || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.tipo || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.url ? /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "btn btn-light", href: d.url, target: "_blank", rel: "noreferrer", children: "Abrir" }) : "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.size_bytes ? `${(Number(d.size_bytes) / 1024).toFixed(1)} KB` : "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : "-" }),
              podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn btn-light",
                  type: "button",
                  onClick: () => removerDocumento(d.id),
                  disabled: removendoDocId === d.id,
                  children: removendoDocId === d.id ? "Removendo..." : "Remover"
                }
              ) })
            ] }, d.id))
          ] })
        ] }) })
      ] })
    ] }),
    !erro && !viagem && !loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: "Viagem não encontrada ou sem permissão." })
  ] });
}

const $$Astro = createAstro();
const $$id = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  const activePage = "operacao_viagens";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dossi\xEA da Viagem", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Dossi\xEA da Viagem", "subtitle": "Detalhes, passageiros e documentos vinculados.", "color": "teal" })} ${renderComponent($$result2, "DossieViagemIsland", DossieViagemIsland, { "client:load": true, "viagemId": id, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/DossieViagemIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/operacao/viagens/[id].astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/operacao/viagens/[id].astro";
const $$url = "/operacao/viagens/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
