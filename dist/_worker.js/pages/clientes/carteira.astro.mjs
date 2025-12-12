globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B4UzsGdb.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';
import { r as registrarLog } from '../../chunks/logs_D3Eb6w9w.mjs';
import { t as titleCaseWithExceptions } from '../../chunks/titleCase_DEDuDeMf.mjs';

const initialForm = {
  nome: "",
  nascimento: "",
  cpf: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  complemento: "",
  cidade: "",
  estado: "",
  cep: "",
  rg: "",
  genero: "",
  nacionalidade: "",
  tags: "",
  tipo_cliente: "passageiro",
  notas: "",
  active: true
};
function ClientesIsland() {
  const { permissao, ativo, loading: loadPerm} = usePermissao("Clientes");
  const podeVer = permissao !== "none";
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar = permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir = permissao === "delete" || permissao === "admin";
  const [clientes, setClientes] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [form, setForm] = reactExports.useState(initialForm);
  const [editId, setEditId] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [historicoCliente, setHistoricoCliente] = reactExports.useState(null);
  const [historicoVendas, setHistoricoVendas] = reactExports.useState([]);
  const [historicoOrcamentos, setHistoricoOrcamentos] = reactExports.useState([]);
  const [loadingHistorico, setLoadingHistorico] = reactExports.useState(false);
  const [detalheVenda, setDetalheVenda] = reactExports.useState(null);
  const [detalheRecibos, setDetalheRecibos] = reactExports.useState([]);
  const [carregandoRecibos, setCarregandoRecibos] = reactExports.useState(false);
  const [detalheOrcamento, setDetalheOrcamento] = reactExports.useState(null);
  async function carregar() {
    if (!podeVer) return;
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase.from("clientes").select("*").order("nome", { ascending: true });
      if (error) throw error;
      setClientes(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (!loadPerm && podeVer) carregar();
  }, [loadPerm, podeVer]);
  const filtrados = reactExports.useMemo(() => {
    if (!busca.trim()) return clientes;
    const t = busca.toLowerCase();
    return clientes.filter(
      (c) => c.nome.toLowerCase().includes(t) || (c.cpf || "").includes(t) || (c.email || "").toLowerCase().includes(t)
    );
  }, [clientes, busca]);
  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }
  function iniciarNovo() {
    if (!podeCriar) return;
    setEditId(null);
    setForm(initialForm);
  }
  async function abrirHistorico(cliente) {
    setHistoricoCliente(cliente);
    setLoadingHistorico(true);
    try {
      const { data: viagens } = await supabase.from("historico_viagens_real").select("id, data_viagem, valor_total, notas, destinos:produtos!destino_id (nome)").eq("cliente_id", cliente.id).order("data_viagem", { ascending: false });
      const viagensFmt = viagens?.map((v) => ({
        id: v.id,
        data_viagem: v.data_viagem,
        destino_nome: v.destinos?.nome || "",
        valor_total: v.valor_total ?? null,
        notas: v.notas || null
      })) || [];
      const { data: vendasData } = await supabase.from("vendas").select("id, data_lancamento, data_embarque, destino_id, destinos:produtos!destino_id (nome)").eq("cliente_id", cliente.id).order("data_lancamento", { ascending: false });
      let vendasFmt = [];
      if (vendasData && vendasData.length > 0) {
        const vendaIds = vendasData.map((v) => v.id);
        const { data: recs } = await supabase.from("vendas_recibos").select("venda_id, valor_total, valor_taxas").in("venda_id", vendaIds);
        vendasFmt = vendasData.map((v) => {
          const recForVenda = (recs || []).filter((r) => r.venda_id === v.id);
          const total = recForVenda.reduce(
            (acc, r) => acc + (r.valor_total || 0),
            0
          );
          const taxas = recForVenda.reduce(
            (acc, r) => acc + (r.valor_taxas || 0),
            0
          );
          return {
            id: v.id,
            data_lancamento: v.data_lancamento,
            data_embarque: v.data_embarque,
            destino_nome: v.destinos?.nome || "",
            valor_total: total,
            valor_taxas: taxas
          };
        });
      }
      const { data: orc } = await supabase.from("orcamentos").select("id, data_orcamento, status, valor, numero_venda, destinos:produtos!destino_id (nome)").eq("cliente_id", cliente.id).order("data_orcamento", { ascending: false });
      const orcFmt = orc?.map((o) => ({
        id: o.id,
        data_orcamento: o.data_orcamento,
        status: o.status,
        valor: o.valor ?? null,
        numero_venda: o.numero_venda ?? null,
        destino_nome: o.destinos?.nome || null
      })) || [];
      setHistoricoVendas(vendasFmt);
      setHistoricoOrcamentos(orcFmt);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar histórico do cliente.");
    } finally {
      setLoadingHistorico(false);
    }
  }
  function fecharHistorico() {
    setHistoricoCliente(null);
    setHistoricoVendas([]);
    setHistoricoOrcamentos([]);
    setDetalheVenda(null);
    setDetalheRecibos([]);
    setDetalheOrcamento(null);
  }
  async function verDetalheVenda(v) {
    setDetalheVenda(v);
    setCarregandoRecibos(true);
    try {
      const { data } = await supabase.from("vendas_recibos").select("numero_recibo, valor_total, valor_taxas, produtos(nome)").eq("venda_id", v.id);
      setDetalheRecibos(
        (data || []).map((r) => ({
          numero_recibo: r.numero_recibo,
          valor_total: r.valor_total,
          valor_taxas: r.valor_taxas,
          produto_nome: r.produtos?.nome || null
        }))
      );
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar recibos da venda.");
    } finally {
      setCarregandoRecibos(false);
    }
  }
  function verDetalheOrcamento(o) {
    setDetalheOrcamento(o);
  }
  function iniciarEdicao(c) {
    if (!podeEditar) return;
    setEditId(c.id);
    setForm({
      nome: c.nome,
      nascimento: c.nascimento || "",
      cpf: c.cpf,
      telefone: c.telefone,
      whatsapp: c.whatsapp || "",
      email: c.email || "",
      endereco: c.endereco || "",
      complemento: c.complemento || "",
      cidade: c.cidade || "",
      estado: c.estado || "",
      cep: c.cep || "",
      rg: c.rg || "",
      genero: c.genero || "",
      nacionalidade: c.nacionalidade || "",
      tags: (c.tags || []).join(", "),
      tipo_cliente: c.tipo_cliente || "passageiro",
      notas: c.notas || "",
      active: c.active
    });
  }
  async function salvar(e) {
    e.preventDefault();
    if (!podeCriar && !podeEditar) return;
    try {
      setSalvando(true);
      setErro(null);
      const nomeNormalizado = titleCaseWithExceptions(form.nome);
      const payload = {
        nome: nomeNormalizado,
        nascimento: form.nascimento || null,
        cpf: form.cpf.trim(),
        telefone: form.telefone.trim(),
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        endereco: form.endereco.trim() || null,
        complemento: form.complemento.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        cep: form.cep.trim() || null,
        rg: form.rg.trim() || null,
        genero: form.genero.trim() || null,
        nacionalidade: form.nacionalidade.trim() || null,
        tags: form.tags ? form.tags.split(",").map((x) => x.trim()) : [],
        tipo_cliente: form.tipo_cliente,
        notas: form.notas || null,
        active: form.active
      };
      if (editId) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editId);
        if (error) throw error;
        await registrarLog({
          acao: "cliente_editado",
          modulo: "Clientes",
          detalhes: { id: editId, payload }
        });
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
        await registrarLog({
          acao: "cliente_criado",
          modulo: "Clientes",
          detalhes: payload
        });
      }
      setForm(initialForm);
      setEditId(null);
      await carregar();
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar cliente.");
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (!podeExcluir) return;
    if (!window.confirm("Excluir cliente?")) return;
    try {
      setExcluindoId(id);
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
      await registrarLog({
        acao: "cliente_excluido",
        modulo: "Clientes",
        detalhes: { id }
      });
      await carregar();
    } catch {
      setErro("Não foi possível excluir este cliente.");
    } finally {
      setExcluindoId(null);
    }
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Acesso negado ao módulo de Clientes." }) });
  }
  const modoSomenteLeitura = !podeCriar && !podeEditar;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "clientes-page", children: [
      !modoSomenteLeitura && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: editId ? "Editar cliente" : "Novo cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: form.nome,
                onChange: (e) => handleChange("nome", e.target.value),
                onBlur: (e) => handleChange("nome", titleCaseWithExceptions(e.target.value)),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "CPF *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: form.cpf,
                onChange: (e) => handleChange("cpf", e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Telefone *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: form.telefone,
                onChange: (e) => handleChange("telefone", e.target.value)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Whatsapp" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: form.whatsapp,
                onChange: (e) => handleChange("whatsapp", e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Email" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: form.email,
                onChange: (e) => handleChange("email", e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tags (,) " }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: form.tags,
                onChange: (e) => handleChange("tags", e.target.value),
                placeholder: "premium, recorrente..."
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-primary",
              disabled: salvando,
              type: "submit",
              children: salvando ? "Salvando..." : editId ? "Salvar alterações" : "Criar cliente"
            }
          ),
          editId && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-light",
              onClick: iniciarNovo,
              children: "Cancelar"
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "form-input",
            value: busca,
            onChange: (e) => setBusca(e.target.value),
            placeholder: "Nome, CPF ou e-mail"
          }
        )
      ] }) }) }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[960px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CPF" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Telefone" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "E-mail" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
          (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Carregando..." }) }),
          !loading && filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhum cliente encontrado." }) }),
          !loading && filtrados.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.cpf }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.telefone }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.email || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.active ? "Sim" : "Não" }),
            (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn-icon",
                  onClick: () => abrirHistorico(c),
                  title: "Histórico",
                  children: "🗂️"
                }
              ),
              podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn-icon",
                  onClick: () => iniciarEdicao(c),
                  title: "Editar",
                  children: "✏️"
                }
              ),
              podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn-icon btn-danger",
                  onClick: () => excluir(c.id),
                  disabled: excluindoId === c.id,
                  title: "Excluir",
                  children: excluindoId === c.id ? "..." : "🗑️"
                }
              )
            ] })
          ] }, c.id))
        ] })
      ] }) })
    ] }),
    historicoCliente && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-panel", style: { maxWidth: 1100, width: "95vw" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-title", children: [
            "Histórico de ",
            historicoCliente.nome
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Vendas e orçamentos do cliente" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: fecharHistorico, children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
        loadingHistorico && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Carregando histórico..." }),
        !loadingHistorico && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginBottom: 8 }, children: "Vendas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[820px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data lançamento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Embarque" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                historicoVendas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhuma venda encontrada." }) }),
                historicoVendas.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_lancamento ? new Date(v.data_lancamento).toLocaleDateString("pt-BR") : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_embarque ? new Date(v.data_embarque).toLocaleDateString("pt-BR") : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.destino_nome || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.valor_total.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.valor_taxas.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "btn-icon",
                      type: "button",
                      onClick: () => verDetalheVenda(v),
                      title: "Ver detalhes",
                      children: "👁️"
                    }
                  ) })
                ] }, v.id))
              ] })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginBottom: 8 }, children: "Orçamentos do cliente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[760px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Venda" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                historicoOrcamentos.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhum orçamento encontrado." }) }),
                historicoOrcamentos.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.data_orcamento?.slice(0, 10) || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textTransform: "capitalize" }, children: o.status || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.destino_nome || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: (o.valor ?? 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.numero_venda || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "btn-icon",
                      type: "button",
                      onClick: () => verDetalheOrcamento(o),
                      title: "Ver detalhes",
                      children: "👁️"
                    }
                  ) })
                ] }, o.id))
              ] })
            ] }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-footer", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-outline", onClick: fecharHistorico, children: "Fechar" }) })
    ] }) }),
    detalheVenda && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-panel", style: { maxWidth: 720 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-title", children: "Detalhes da venda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { style: { color: "#64748b" }, children: [
            "Destino: ",
            detalheVenda.destino_nome || "-"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: () => {
          setDetalheVenda(null);
          setDetalheRecibos([]);
        }, children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12, lineHeight: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Lançamento:" }),
            " ",
            new Date(detalheVenda.data_lancamento).toLocaleDateString("pt-BR")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Embarque:" }),
            " ",
            detalheVenda.data_embarque ? new Date(detalheVenda.data_embarque).toLocaleDateString("pt-BR") : "-"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Valor:" }),
            " ",
            detalheVenda.valor_total.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Taxas:" }),
            " ",
            detalheVenda.valor_taxas.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginBottom: 8 }, children: "Recibos" }),
        carregandoRecibos ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Carregando recibos..." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue", style: { minWidth: 520 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Número" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            detalheRecibos.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Nenhum recibo encontrado." }) }),
            detalheRecibos.map((r, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.numero_recibo || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.produto_nome || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: (r.valor_total || 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: (r.valor_taxas || 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              }) })
            ] }, idx))
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-footer", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn-outline",
          onClick: () => {
            setDetalheVenda(null);
            setDetalheRecibos([]);
          },
          children: "Fechar"
        }
      ) })
    ] }) }),
    detalheOrcamento && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-panel", style: { maxWidth: 640 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-title", children: "Detalhes do orçamento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { style: { color: "#64748b" }, children: [
            "Destino: ",
            detalheOrcamento.destino_nome || "-"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: () => setDetalheOrcamento(null), children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-body", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { lineHeight: 1.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Data:" }),
          " ",
          detalheOrcamento.data_orcamento ? new Date(detalheOrcamento.data_orcamento).toLocaleDateString("pt-BR") : "-"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Status:" }),
          " ",
          detalheOrcamento.status || "-"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Valor:" }),
          " ",
          (detalheOrcamento.valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Venda vinculada:" }),
          " ",
          detalheOrcamento.numero_venda || "-"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-footer", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-outline", onClick: () => setDetalheOrcamento(null), children: "Fechar" }) })
    ] }) })
  ] });
}

const $$Carteira = createComponent(($$result, $$props, $$slots) => {
  const activePage = "clientes";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Carteira de Clientes", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Carteira de Clientes", "subtitle": "Gerencie seus clientes com vis\xE3o de CRM.", "color": "blue" })} ${renderComponent($$result2, "ClientesIsland", ClientesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ClientesIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/clientes/carteira.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/clientes/carteira.astro";
const $$url = "/clientes/carteira";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Carteira,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
