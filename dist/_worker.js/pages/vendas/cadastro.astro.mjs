globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout__E2c9QIl.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';
import { r as registrarLog } from '../../chunks/logs_D3Eb6w9w.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const initialVenda = {
  cliente_id: "",
  destino_id: "",
  data_lancamento: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
  data_embarque: ""
};
const initialRecibo = {
  produto_id: "",
  numero_recibo: "",
  valor_total: "",
  valor_taxas: "0"
};
function VendasCadastroIsland() {
  const { permissao, ativo, loading: loadPerm, isAdmin } = usePermissao("Vendas");
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const [clientes, setClientes] = reactExports.useState([]);
  const [destinos, setDestinos] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const [formVenda, setFormVenda] = reactExports.useState(initialVenda);
  const [recibos, setRecibos] = reactExports.useState([]);
  const [editId, setEditId] = reactExports.useState(null);
  const [erro, setErro] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(true);
  const [loadingVenda, setLoadingVenda] = reactExports.useState(false);
  const [buscaCliente, setBuscaCliente] = reactExports.useState("");
  const [buscaDestino, setBuscaDestino] = reactExports.useState("");
  const [buscaProduto, setBuscaProduto] = reactExports.useState("");
  async function carregarDados(vendaId) {
    try {
      setLoading(true);
      const [c, d, p] = await Promise.all([
        supabase.from("clientes").select("id, nome, cpf").order("nome"),
        supabase.from("produtos").select("id, nome").order("nome"),
        supabase.from("tipo_produtos").select("id, nome").order("nome")
      ]);
      setClientes(c.data || []);
      setDestinos(d.data || []);
      setProdutos(p.data || []);
      if (vendaId) {
        await carregarVenda(vendaId);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }
  async function carregarVenda(id) {
    try {
      setLoadingVenda(true);
      const { data: vendaData, error: vendaErr } = await supabase.from("vendas").select("id, cliente_id, destino_id, data_lancamento, data_embarque").eq("id", id).maybeSingle();
      if (vendaErr) throw vendaErr;
      if (!vendaData) {
        setErro("Venda não encontrada para edição.");
        return;
      }
      setFormVenda({
        cliente_id: vendaData.cliente_id,
        destino_id: vendaData.destino_id,
        data_lancamento: vendaData.data_lancamento,
        data_embarque: vendaData.data_embarque || ""
      });
      const { data: recibosData, error: recErr } = await supabase.from("vendas_recibos").select("*").eq("venda_id", id);
      if (recErr) throw recErr;
      setRecibos(
        (recibosData || []).map((r) => ({
          id: r.id,
          produto_id: r.produto_id || "",
          numero_recibo: r.numero_recibo || "",
          valor_total: r.valor_total != null ? String(r.valor_total) : "",
          valor_taxas: r.valor_taxas != null ? String(r.valor_taxas) : "0"
        }))
      );
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar venda para edição.");
    } finally {
      setLoadingVenda(false);
    }
  }
  reactExports.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setEditId(idParam);
  }, []);
  reactExports.useEffect(() => {
    if (!loadPerm && ativo) carregarDados(editId || void 0);
  }, [loadPerm, ativo, editId]);
  const normalizarCpf = (v) => v.replace(/\D/g, "");
  const clientesFiltrados = reactExports.useMemo(() => {
    if (!buscaCliente.trim()) return clientes;
    const t = normalizeText(buscaCliente);
    return clientes.filter((c) => {
      const cpf = normalizarCpf(c.cpf || "");
      return normalizeText(c.nome).includes(t) || cpf.includes(normalizarCpf(t));
    });
  }, [clientes, buscaCliente]);
  const destinosFiltrados = reactExports.useMemo(() => {
    if (!buscaDestino.trim()) return destinos;
    const t = normalizeText(buscaDestino);
    return destinos.filter((c) => normalizeText(c.nome).includes(t));
  }, [destinos, buscaDestino]);
  const produtosFiltrados = reactExports.useMemo(() => {
    if (!buscaProduto.trim()) return produtos;
    const t = normalizeText(buscaProduto);
    return produtos.filter((c) => normalizeText(c.nome).includes(t));
  }, [produtos, buscaProduto]);
  function addRecibo() {
    setRecibos((prev) => [...prev, { ...initialRecibo }]);
  }
  function updateRecibo(index, campo, valor) {
    setRecibos((prev) => {
      const novo = [...prev];
      novo[index][campo] = valor;
      return novo;
    });
  }
  function removerRecibo(index) {
    setRecibos((prev) => prev.filter((_, i) => i !== index));
  }
  async function salvarVenda(e) {
    e.preventDefault();
    if (!podeCriar && !isAdmin) {
      setErro("Você não possui permissão para cadastrar vendas.");
      return;
    }
    if (recibos.length === 0) {
      setErro("Uma venda precisa ter ao menos 1 recibo.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        setSalvando(false);
        return;
      }
      let vendaId = editId;
      if (editId) {
        const { error: vendaErr } = await supabase.from("vendas").update({
          cliente_id: formVenda.cliente_id,
          destino_id: formVenda.destino_id,
          data_lancamento: formVenda.data_lancamento,
          data_embarque: formVenda.data_embarque || null
        }).eq("id", editId);
        if (vendaErr) throw vendaErr;
        await supabase.from("vendas_recibos").delete().eq("venda_id", editId);
        for (const r of recibos) {
          const { error } = await supabase.from("vendas_recibos").insert({
            venda_id: editId,
            produto_id: r.produto_id || null,
            numero_recibo: r.numero_recibo.trim(),
            valor_total: Number(r.valor_total),
            valor_taxas: Number(r.valor_taxas)
          });
          if (error) throw error;
        }
        await registrarLog({
          acao: "venda_atualizada",
          modulo: "Vendas",
          detalhes: { id: editId, venda: formVenda, recibos }
        });
        alert("Venda atualizada com sucesso!");
        await carregarVenda(editId);
      } else {
        const { data: vendaData, error: vendaErr } = await supabase.from("vendas").insert({
          vendedor_id: userId,
          cliente_id: formVenda.cliente_id,
          destino_id: formVenda.destino_id,
          data_lancamento: formVenda.data_lancamento,
          data_embarque: formVenda.data_embarque || null
        }).select().single();
        if (vendaErr) throw vendaErr;
        vendaId = vendaData.id;
        for (const r of recibos) {
          const { error } = await supabase.from("vendas_recibos").insert({
            venda_id: vendaId,
            produto_id: r.produto_id || null,
            numero_recibo: r.numero_recibo.trim(),
            valor_total: Number(r.valor_total),
            valor_taxas: Number(r.valor_taxas)
          });
          if (error) throw error;
        }
        await registrarLog({
          acao: "venda_criada",
          modulo: "Vendas",
          detalhes: {
            venda: formVenda,
            recibos,
            id: vendaId
          }
        });
        alert("Venda cadastrada com sucesso!");
        setFormVenda(initialVenda);
        setRecibos([]);
      }
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar venda.");
    } finally {
      setSalvando(false);
    }
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Acesso negado ao módulo de Vendas." }) });
  }
  if (!podeCriar && !isAdmin) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Você não possui permissão para cadastrar vendas." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "vendas-cadastro-page", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green mb-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: editId ? "Editar venda" : "Cadastro de Venda" }),
    editId && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#0f172a" }, children: "Modo edição — altere cliente, destino, embarque e recibos." }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvarVenda, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cliente *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              list: "listaClientes",
              placeholder: "Buscar cliente...",
              value: clientes.find((c) => c.id === formVenda.cliente_id)?.nome || buscaCliente,
              onChange: (e) => setBuscaCliente(e.target.value),
              onBlur: () => {
                const texto = buscaCliente.toLowerCase();
                const cpfTexto = normalizarCpf(buscaCliente);
                const achado = clientesFiltrados.find((c) => {
                  const cpf = normalizarCpf(c.cpf || "");
                  return c.nome.toLowerCase() === texto || cpfTexto && cpf === cpfTexto;
                });
                if (achado) {
                  setFormVenda({
                    ...formVenda,
                    cliente_id: achado.id
                  });
                }
              },
              required: true
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "listaClientes", children: clientesFiltrados.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "option",
            {
              value: c.nome,
              label: c.cpf ? `CPF: ${c.cpf}` : void 0
            },
            c.id
          )) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destino *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              list: "listaDestinos",
              placeholder: "Buscar destino...",
              value: destinos.find((d) => d.id === formVenda.destino_id)?.nome || buscaDestino,
              onChange: (e) => setBuscaDestino(e.target.value),
              onBlur: () => {
                const achado = destinosFiltrados.find(
                  (d) => d.nome.toLowerCase() === buscaDestino.toLowerCase()
                );
                if (achado) {
                  setFormVenda({
                    ...formVenda,
                    destino_id: achado.id
                  });
                }
              },
              required: true
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "listaDestinos", children: destinosFiltrados.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.nome }, d.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data de embarque" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "date",
              value: formVenda.data_embarque,
              onChange: (e) => setFormVenda({
                ...formVenda,
                data_embarque: e.target.value
              })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "mt-3", children: "Recibos da Venda" }),
      recibos.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Produto *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              list: "listaProdutos",
              placeholder: "Buscar produto...",
              value: produtos.find((p) => p.id === r.produto_id)?.nome || buscaProduto,
              onChange: (e) => setBuscaProduto(e.target.value),
              onBlur: () => {
                const achado = produtosFiltrados.find(
                  (p) => p.nome.toLowerCase() === buscaProduto.toLowerCase()
                );
                if (achado) {
                  updateRecibo(i, "produto_id", achado.id);
                }
              },
              required: true
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "listaProdutos", children: produtosFiltrados.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.nome }, p.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Número recibo *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: r.numero_recibo,
              onChange: (e) => updateRecibo(i, "numero_recibo", e.target.value),
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor total *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: r.valor_total,
              onChange: (e) => updateRecibo(i, "valor_total", e.target.value),
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Taxas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: r.valor_taxas,
              onChange: (e) => updateRecibo(i, "valor_taxas", e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", style: { width: "80px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn-icon btn-danger mt-4",
            onClick: () => removerRecibo(i),
            children: "🗑️"
          }
        ) })
      ] }) }, i)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3", style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            onClick: addRecibo,
            children: "➕ Adicionar recibo"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            className: "btn btn-success",
            disabled: salvando,
            children: salvando ? "Salvando..." : "Salvar venda"
          }
        )
      ] })
    ] })
  ] }) });
}

const $$Cadastro = createComponent(($$result, $$props, $$slots) => {
  const activePage = "vendas";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Vendas", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Vendas", "subtitle": "Registre vendas completas com cliente, destino, produto e recibos.", "color": "green" })} ${renderComponent($$result2, "VendasCadastroIsland", VendasCadastroIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/VendasCadastroIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/vendas/cadastro.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/vendas/cadastro.astro";
const $$url = "/vendas/cadastro";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cadastro,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
