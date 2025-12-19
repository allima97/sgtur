globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B-SnFw9s.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_ChD594_G.mjs';
import { r as registrarLog } from '../../chunks/logs_D3Eb6w9w.mjs';
import { t as titleCaseWithExceptions } from '../../chunks/titleCase_DEDuDeMf.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_XbJI-A09.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const initialForm = {
  nome: "",
  subdivisao_id: "",
  descricao: ""
};
function CidadesIsland() {
  const permCidade = usePermissao("Cidades");
  const permCadastros = usePermissao("Cadastros");
  const isAdmin = permCidade.isAdmin || permCadastros.isAdmin;
  const carregando = permCidade.loading || permCadastros.loading;
  const permissao = isAdmin ? "admin" : permCidade.permissao !== "none" ? permCidade.permissao : permCadastros.permissao;
  const podeVer = isAdmin || permissao !== "none";
  const podeCriar = isAdmin || permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar = isAdmin || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir = isAdmin || permissao === "delete" || permissao === "admin";
  const [paises, setPaises] = reactExports.useState([]);
  const [subdivisoes, setSubdivisoes] = reactExports.useState([]);
  const [cidades, setCidades] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [form, setForm] = reactExports.useState(initialForm);
  const [editId, setEditId] = reactExports.useState(null);
  const [erro, setErro] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [carregouTodos, setCarregouTodos] = reactExports.useState(false);
  const [loadingBusca, setLoadingBusca] = reactExports.useState(false);
  async function carregar(todos = false) {
    if (!podeVer) return;
    async function carregarCidades() {
      const selectPadrao = "id, nome, subdivisao_id, descricao, created_at";
      const selectFallback = "id, nome, subdivisao_id, descricao";
      if (todos) {
        const todas = [];
        const pageSize = 1e3;
        let from = 0;
        while (true) {
          try {
            const { data, error } = await supabase.from("cidades").select(selectPadrao).order("nome").range(from, from + pageSize - 1);
            if (error) throw error;
            todas.push(...data || []);
            if (!data || data.length < pageSize) break;
            from += pageSize;
          } catch (err) {
            console.warn("[Cidades] Falha na query principal, aplicando fallback.", err);
            try {
              const { data, error } = await supabase.from("cidades").select(selectFallback).order("nome").range(from, from + pageSize - 1);
              if (error) throw error;
              todas.push(...data || []);
              if (!data || data.length < pageSize) break;
              from += pageSize;
            } catch (fallbackErr) {
              console.warn("[Cidades] Fallback sem campo descricao.", fallbackErr);
              const { data, error } = await supabase.from("cidades").select("id, nome, subdivisao_id").order("nome").range(from, from + pageSize - 1);
              if (error) throw error;
              todas.push(...data || []);
              if (!data || data.length < pageSize) break;
              from += pageSize;
            }
          }
        }
        return todas;
      } else {
        try {
          const { data, error } = await supabase.from("cidades").select(selectPadrao).order("created_at", { ascending: false }).limit(10);
          if (error) throw error;
          return data || [];
        } catch (err) {
          console.warn("[Cidades] created_at indisponivel, ordenando por nome.", err);
          try {
            const { data, error } = await supabase.from("cidades").select(selectFallback).order("nome").limit(10);
            if (error) throw error;
            return data || [];
          } catch (fallbackErr) {
            console.warn("[Cidades] Fallback sem descricao/nome.", fallbackErr);
            const { data, error } = await supabase.from("cidades").select("id, nome, subdivisao_id").order("nome").limit(10);
            if (error) throw error;
            return data || [];
          }
        }
      }
    }
    try {
      setLoading(true);
      const [
        { data: paisesData, error: paisesErro },
        { data: subdivisoesData, error: subdivisoesErro },
        cidadesData
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("subdivisoes").select("id, nome, pais_id, codigo_admin1, tipo").order("nome"),
        carregarCidades()
      ]);
      if (paisesErro) {
        setErro("Erro ao carregar paises.");
      } else {
        setPaises(paisesData || []);
      }
      if (subdivisoesErro) {
        setErro("Erro ao carregar subdivisoes.");
      } else {
        setSubdivisoes(subdivisoesData || []);
      }
      setCidades(cidadesData || []);
      setCarregouTodos(todos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar cidades.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (carregando) return;
    if (!podeVer) {
      setLoading(false);
      return;
    }
    carregar(false);
  }, [carregando, podeVer]);
  reactExports.useEffect(() => {
    if (!busca.trim() && !carregando && podeVer) {
      carregar(false);
    }
  }, [busca, carregando, podeVer]);
  reactExports.useEffect(() => {
    const termo = busca.trim();
    if (!termo || carregando || !podeVer) return;
    const controller = new AbortController();
    async function buscar() {
      setLoadingBusca(true);
      setErro(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: termo, limite: 200 },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        if (error) throw error;
        const lista = data || [];
        setCidades(
          lista.map((c) => ({
            id: c.id,
            nome: c.nome,
            subdivisao_id: c.subdivisao_id || "",
            descricao: c.descricao || null,
            created_at: c.created_at || null,
            subdivisao_nome: c.subdivisao_nome || "",
            pais_nome: c.pais_nome || ""
          }))
        );
        setCarregouTodos(true);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.warn("[Cidades] RPC falhou, tentando fallback direto.", e);
        try {
          const { data, error } = await supabase.from("cidades").select("id, nome, subdivisao_id, descricao, created_at").ilike("nome", `%${termo}%`).order("nome");
          if (error) throw error;
          setCidades(data || []);
          setCarregouTodos(true);
        } catch (errFinal) {
          console.error(errFinal);
          const msg = errFinal instanceof Error ? errFinal.message : "";
          setErro(`Erro ao buscar cidades.${msg ? ` Detalhe: ${msg}` : ""}`);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingBusca(false);
      }
    }
    buscar();
    return () => controller.abort();
  }, [busca, carregando, podeVer]);
  const cidadesEnriquecidas = reactExports.useMemo(() => {
    const subdivisaoMap = new Map(subdivisoes.map((s) => [s.id, s]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));
    return cidades.map((c) => {
      const subdivisao = c.subdivisao_id ? subdivisaoMap.get(c.subdivisao_id) : void 0;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : void 0;
      return {
        ...c,
        subdivisao_nome: subdivisao?.nome || c.subdivisao_nome || "",
        pais_nome: pais?.nome || c.pais_nome || ""
      };
    });
  }, [cidades, subdivisoes, paises]);
  const filtradas = reactExports.useMemo(() => {
    if (!busca.trim()) return cidadesEnriquecidas;
    const t = normalizeText(busca);
    const cidadesNome = cidadesEnriquecidas.filter(
      (c) => normalizeText(c.nome).includes(t)
    );
    const cidadesOutros = cidadesEnriquecidas.filter(
      (c) => !normalizeText(c.nome).includes(t) && (normalizeText(c.subdivisao_nome || "").includes(t) || normalizeText(c.pais_nome || "").includes(t))
    );
    return [...cidadesNome, ...cidadesOutros];
  }, [busca, cidadesEnriquecidas]);
  function handleChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  function iniciarEdicao(c) {
    if (!podeEditar) return;
    async function prepararEdicao() {
      try {
        let alvo = c;
        if (!c.subdivisao_id) {
          const { data, error } = await supabase.from("cidades").select("id, nome, subdivisao_id, descricao").eq("id", c.id).maybeSingle();
          if (error) throw error;
          if (data) {
            alvo = {
              ...c,
              subdivisao_id: data.subdivisao_id || "",
              descricao: data.descricao || ""
            };
          }
        }
        setEditId(alvo.id);
        setForm({
          nome: alvo.nome,
          subdivisao_id: alvo.subdivisao_id || "",
          descricao: alvo.descricao || ""
        });
      } catch (err) {
        console.error(err);
        setErro("Nao foi possivel carregar dados da cidade para edicao.");
      }
    }
    prepararEdicao();
  }
  function iniciarNovo() {
    if (!podeCriar) return;
    setEditId(null);
    setForm(initialForm);
  }
  async function salvar(e) {
    e.preventDefault();
    if (!podeCriar && !podeEditar) return;
    if (!form.subdivisao_id) {
      setErro("Subdivisao e obrigatoria.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const nomeNormalizado = titleCaseWithExceptions(form.nome);
      const payload = {
        nome: nomeNormalizado,
        subdivisao_id: form.subdivisao_id,
        descricao: form.descricao || null
      };
      if (editId) {
        const { error } = await supabase.from("cidades").update(payload).eq("id", editId);
        if (error) throw error;
        await registrarLog({
          user_id: null,
          acao: "cidade_editada",
          modulo: "Cadastros",
          detalhes: { id: editId, payload }
        });
      } else {
        const { error } = await supabase.from("cidades").insert(payload);
        if (error) throw error;
        await registrarLog({
          user_id: null,
          acao: "cidade_criada",
          modulo: "Cadastros",
          detalhes: payload
        });
      }
      iniciarNovo();
      carregar(carregouTodos);
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar cidade.");
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (!podeExcluir) return;
    if (!confirm("Excluir cidade?")) return;
    try {
      setExcluindoId(id);
      const { error } = await supabase.from("cidades").delete().eq("id", id);
      if (error) throw error;
      await registrarLog({
        user_id: null,
        acao: "cidade_excluida",
        modulo: "Cadastros",
        detalhes: { id }
      });
      carregar(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir cidade (provavelmente usada em produtos/destinos).");
    } finally {
      setExcluindoId(null);
    }
  }
  if (!podeVer && !isAdmin) {
    if (carregando) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, { className: "mb-3" });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: "Voce nao possui permissao para visualizar Cidades." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cidades-page", children: [
    (podeCriar || podeEditar) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: editId ? "Editar cidade" : "Nova cidade" }),
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Subdivisao *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.subdivisao_id,
              onChange: (e) => handleChange("subdivisao_id", e.target.value),
              required: true,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione a subdivisao" }),
                subdivisoes.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: s.id, children: [
                  s.nome,
                  " - ",
                  paises.find((p) => p.id === s.pais_id)?.nome || "Sem pais"
                ] }, s.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Descricao" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "form-input",
            rows: 3,
            value: form.descricao,
            onChange: (e) => handleChange("descricao", e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", disabled: salvando, children: salvando ? "Salvando..." : editId ? "Salvar alteracoes" : "Adicionar cidade" }),
        editId && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: iniciarNovo, children: "Cancelar" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar cidade" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          placeholder: "Nome, subdivisao ou pais...",
          value: busca,
          onChange: (e) => setBusca(e.target.value)
        }
      )
    ] }) }) }),
    carregando && /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, { className: "mb-3" }),
    !carregando && erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    !carregouTodos && !erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Ultimas Cidades Cadastradas (10). Digite na busca para consultar todas." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[720px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Subdivisao" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Pais" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criada em" }),
        (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Acoes" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Carregando..." }) }),
        !loading && filtradas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhuma cidade encontrada." }) }),
        !loading && filtradas.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.subdivisao_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.pais_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.created_at ? c.created_at.slice(0, 10) : "-" }),
          (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
            podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", onClick: () => iniciarEdicao(c), title: "Editar", children: "✏️" }),
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
  ] });
}

const $$Cidades = createComponent(($$result, $$props, $$slots) => {
  const activePage = "cidades";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Cidades", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Cidades", "subtitle": "Gerencie a base de cidades utilizada nos destinos.", "color": "blue" })} ${renderComponent($$result2, "CidadesIsland", CidadesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/CidadesIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/cidades.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/cidades.astro";
const $$url = "/cadastros/cidades";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cidades,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
