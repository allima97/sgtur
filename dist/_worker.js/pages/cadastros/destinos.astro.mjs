globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_Bfm88K_S.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_BpuKPjcn.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';

const initialForm = {
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
  ativo: true
};
function DestinosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [paises, setPaises] = reactExports.useState([]);
  const [cidades, setCidades] = reactExports.useState([]);
  const [destinos, setDestinos] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [busca, setBusca] = reactExports.useState("");
  const [form, setForm] = reactExports.useState(initialForm);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [editandoId, setEditandoId] = reactExports.useState(null);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  async function carregarDadosIniciais() {
    try {
      setLoading(true);
      setErro(null);
      const [
        { data: paisesData, error: paisesErr },
        { data: cidadesData, error: cidadesErr },
        { data: destinosData, error: destinosErr }
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome", { ascending: true }),
        supabase.from("cidades").select("id, nome, pais_id").order("nome", { ascending: true }),
        supabase.from("destinos").select(
          "id, nome, cidade_id, informacoes_importantes, tipo, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, created_at"
        ).order("nome", { ascending: true })
      ]);
      if (paisesErr) throw paisesErr;
      if (cidadesErr) throw cidadesErr;
      if (destinosErr) throw destinosErr;
      setPaises(paisesData || []);
      setCidades(cidadesData || []);
      setDestinos(destinosData || []);
    } catch (e) {
      console.error(e);
      setErro(
        "Erro ao carregar destinos. Verifique se as tabelas 'paises', 'cidades' e 'destinos' existem e se as colunas estão corretas."
      );
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    carregarDadosIniciais();
  }, []);
  const cidadesFiltradas = reactExports.useMemo(() => {
    if (!form.pais_id) return cidades;
    return cidades.filter((c) => c.pais_id === form.pais_id);
  }, [cidades, form.pais_id]);
  const destinosEnriquecidos = reactExports.useMemo(() => {
    const cidadeMap = new Map(cidades.map((c) => [c.id, c]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));
    return destinos.map((d) => {
      const cidade = cidadeMap.get(d.cidade_id || "");
      const pais = cidade ? paisMap.get(cidade.pais_id) : void 0;
      return {
        ...d,
        cidade_nome: cidade?.nome || "",
        pais_nome: pais?.nome || ""
      };
    });
  }, [destinos, cidades, paises]);
  const destinosFiltrados = reactExports.useMemo(() => {
    if (!busca.trim()) return destinosEnriquecidos;
    const termo = busca.toLowerCase();
    return destinosEnriquecidos.filter((d) => {
      return d.nome.toLowerCase().includes(termo) || d.cidade_nome.toLowerCase().includes(termo) || d.pais_nome.toLowerCase().includes(termo);
    });
  }, [destinosEnriquecidos, busca]);
  function handleChange(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
      ...campo === "pais_id" ? { cidade_id: "" } : {}
    }));
  }
  function iniciarNovo() {
    setEditandoId(null);
    setForm(initialForm);
  }
  function iniciarEdicao(destino) {
    const cidade = cidades.find((c) => c.id === destino.cidade_id);
    const paisId = cidade?.pais_id || "";
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
      ativo: destino.ativo ?? true
    });
  }
  async function salvar(e) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Você não tem permissão para salvar destinos.");
      return;
    }
    if (!form.nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (!form.cidade_id) {
      setErro("Cidade é obrigatória.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const payload = {
        nome: form.nome.trim(),
        cidade_id: form.cidade_id,
        tipo: form.tipo.trim() || null,
        atracao_principal: form.atracao_principal.trim() || null,
        melhor_epoca: form.melhor_epoca.trim() || null,
        duracao_sugerida: form.duracao_sugerida.trim() || null,
        nivel_preco: form.nivel_preco.trim() || null,
        imagem_url: form.imagem_url.trim() || null,
        informacoes_importantes: form.informacoes_importantes.trim() || null,
        ativo: form.ativo
      };
      if (editandoId) {
        const { error } = await supabase.from("destinos").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("destinos").insert(payload);
        if (error) throw error;
      }
      setForm(initialForm);
      setEditandoId(null);
      await carregarDadosIniciais();
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar destino. Verifique os dados e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir destinos.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este destino?")) return;
    try {
      setExcluindoId(id);
      setErro(null);
      const { error } = await supabase.from("destinos").delete().eq("id", id);
      if (error) throw error;
      await carregarDadosIniciais();
    } catch (e) {
      console.error(e);
      setErro("Não foi possível excluir o destino. Verifique se não existem vendas vinculadas.");
    } finally {
      setExcluindoId(null);
    }
  }
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando permissões..." });
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Cadastros." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "destinos-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome do destino *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value),
              placeholder: "Ex: Orlando, Paris, Gramado...",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "País *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.pais_id,
              onChange: (e) => handleChange("pais_id", e.target.value),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione um país" }),
                paises.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.nome }, p.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.cidade_id,
              onChange: (e) => handleChange("cidade_id", e.target.value),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione uma cidade" }),
                cidadesFiltradas.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.nome }, c.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.tipo,
              onChange: (e) => handleChange("tipo", e.target.value),
              placeholder: "Ex: Cidade, Praia, Parque, Serra...",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Atração principal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.atracao_principal,
              onChange: (e) => handleChange("atracao_principal", e.target.value),
              placeholder: "Ex: Disney, Torre Eiffel, Centro Histórico...",
              disabled: permissao === "view"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Melhor época" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.melhor_epoca,
              onChange: (e) => handleChange("melhor_epoca", e.target.value),
              placeholder: "Ex: Dezembro a Março",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Duração sugerida" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.duracao_sugerida,
              onChange: (e) => handleChange("duracao_sugerida", e.target.value),
              placeholder: "Ex: 7 dias",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nível de preço" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nivel_preco,
              onChange: (e) => handleChange("nivel_preco", e.target.value),
              placeholder: "Ex: Econômico, Intermediário, Premium",
              disabled: permissao === "view"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Imagem (URL)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.imagem_url,
              onChange: (e) => handleChange("imagem_url", e.target.value),
              placeholder: "URL de uma imagem do destino",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.ativo ? "true" : "false",
              onChange: (e) => handleChange("ativo", e.target.value === "true"),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Informações importantes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "form-input",
            rows: 3,
            value: form.informacoes_importantes,
            onChange: (e) => handleChange("informacoes_importantes", e.target.value),
            placeholder: "Observações gerais, dicas, documentação necessária, etc.",
            disabled: permissao === "view"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
        permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            className: "btn btn-primary",
            disabled: salvando,
            children: salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar destino"
          }
        ),
        editandoId && permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            style: { marginLeft: 8 },
            onClick: iniciarNovo,
            children: "Cancelar edição"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar destino" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          value: busca,
          onChange: (e) => setBusca(e.target.value),
          placeholder: "Busque por nome, cidade ou país..."
        }
      )
    ] }) }) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[960px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "País" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nível de preço" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 8, children: "Carregando destinos..." }) }),
        !loading && destinosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 8, children: "Nenhum destino encontrado." }) }),
        !loading && destinosFiltrados.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.cidade_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.pais_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.tipo || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.nivel_preco || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.ativo ? "Sim" : "Não" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: d.created_at ? new Date(d.created_at).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
            permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon",
                title: "Editar",
                onClick: () => iniciarEdicao(d),
                children: "✏️"
              }
            ),
            permissao === "admin" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                title: "Excluir",
                onClick: () => excluir(d.id),
                disabled: excluindoId === d.id,
                children: excluindoId === d.id ? "..." : "🗑️"
              }
            )
          ] })
        ] }, d.id))
      ] })
    ] }) })
  ] });
}

const $$Destinos = createComponent(($$result, $$props, $$slots) => {
  const activePage = "destinos";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Destinos", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Destinos", "subtitle": "Gerencie destinos completos vinculados a pa\xEDses e cidades.", "color": "blue" })} ${renderComponent($$result2, "DestinosIsland", DestinosIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgt-astro/src/components/islands/DestinosIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgt-astro/src/pages/cadastros/destinos.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgt-astro/src/pages/cadastros/destinos.astro";
const $$url = "/cadastros/destinos";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Destinos,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
