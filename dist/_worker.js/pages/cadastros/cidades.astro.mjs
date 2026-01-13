globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B2E7go2h.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_pW02Hlay.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_p9GcBfMe.mjs';
import { r as registrarLog } from '../../chunks/logs_CFVP_wVx.mjs';
import { t as titleCaseWithExceptions } from '../../chunks/titleCase_DEDuDeMf.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_R_BoJegu.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
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
  const [mostrarFormulario, setMostrarFormulario] = reactExports.useState(false);
  const [loadingBusca, setLoadingBusca] = reactExports.useState(false);
  const [subdivisaoBusca, setSubdivisaoBusca] = reactExports.useState("");
  const [mostrarSugestoesSubdivisao, setMostrarSugestoesSubdivisao] = reactExports.useState(false);
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
    async function carregarSubdivisoes() {
      const todas = [];
      const pageSize = 1e3;
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("subdivisoes").select("id, nome, pais_id, codigo_admin1, tipo").order("nome").range(from, from + pageSize - 1);
        if (error) throw error;
        todas.push(...data || []);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return todas;
    }
    try {
      setLoading(true);
      const [
        { data: paisesData, error: paisesErro },
        subdivisoesData,
        cidadesData
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        carregarSubdivisoes(),
        carregarCidades()
      ]);
      if (paisesErro) {
        setErro("Erro ao carregar paises.");
      } else {
        setPaises(paisesData || []);
      }
      setSubdivisoes(subdivisoesData || []);
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
  const subdivisoesEnriquecidas = reactExports.useMemo(() => {
    const paisMap = new Map(paises.map((p) => [p.id, p.nome]));
    return subdivisoes.map((s) => {
      const paisNome = paisMap.get(s.pais_id) || "";
      const codigo = s.codigo_admin1 ? ` (${s.codigo_admin1})` : "";
      return {
        ...s,
        pais_nome: paisNome,
        label: `${s.nome}${codigo}${paisNome ? ` - ${paisNome}` : ""}`
      };
    });
  }, [subdivisoes, paises]);
  const subdivisoesFiltradas = reactExports.useMemo(() => {
    if (!subdivisaoBusca.trim()) return subdivisoesEnriquecidas;
    const termo = normalizeText(subdivisaoBusca);
    return subdivisoesEnriquecidas.filter(
      (s) => normalizeText(s.nome).includes(termo) || normalizeText(s.codigo_admin1 || "").includes(termo) || normalizeText(s.tipo || "").includes(termo) || normalizeText(s.pais_nome || "").includes(termo) || normalizeText(s.label || "").includes(termo)
    );
  }, [subdivisaoBusca, subdivisoesEnriquecidas]);
  reactExports.useEffect(() => {
    if (!mostrarFormulario) return;
    if (!form.subdivisao_id) return;
    const atual = subdivisoesEnriquecidas.find((s) => s.id === form.subdivisao_id);
    if (!atual) return;
    const label = atual.label || atual.nome;
    if (normalizeText(subdivisaoBusca) !== normalizeText(label)) {
      setSubdivisaoBusca(label);
    }
  }, [form.subdivisao_id, subdivisoesEnriquecidas, mostrarFormulario]);
  function handleChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  function handleSubdivisaoBusca(valor) {
    setSubdivisaoBusca(valor);
    if (!valor.trim()) {
      handleChange("subdivisao_id", "");
      return;
    }
    const termo = normalizeText(valor);
    const match = subdivisoesEnriquecidas.find(
      (s) => normalizeText(s.label || s.nome) === termo || normalizeText(s.nome) === termo || normalizeText(s.codigo_admin1 || "") === termo
    );
    if (match) {
      handleChange("subdivisao_id", match.id);
      return;
    }
    if (form.subdivisao_id) {
      handleChange("subdivisao_id", "");
    }
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
        if (alvo.subdivisao_id) {
          const subdiv = subdivisoes.find((s) => s.id === alvo.subdivisao_id);
          const paisNome = subdiv ? paises.find((p) => p.id === subdiv.pais_id)?.nome || "" : "";
          const label = subdiv ? `${subdiv.nome}${paisNome ? ` - ${paisNome}` : ""}` : "";
          setSubdivisaoBusca(label);
        } else {
          setSubdivisaoBusca("");
        }
      } catch (err) {
        console.error(err);
        setErro("Nao foi possivel carregar dados da cidade para edicao.");
      }
    }
    prepararEdicao();
    setMostrarFormulario(true);
  }
  function iniciarNovo() {
    setEditId(null);
    setForm(initialForm);
    setSubdivisaoBusca("");
  }
  function abrirFormulario() {
    if (!podeCriar) return;
    iniciarNovo();
    setMostrarFormulario(true);
  }
  function fecharFormulario() {
    iniciarNovo();
    setMostrarFormulario(false);
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
      carregar(carregouTodos);
      fecharFormulario();
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
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "form-row",
        style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: "1 1 320px" }, children: [
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
          ] }),
          podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", style: { alignItems: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary",
              onClick: abrirFormulario,
              disabled: mostrarFormulario,
              children: "Adicionar cidade"
            }
          ) })
        ]
      }
    ) }),
    (podeCriar || podeEditar) && mostrarFormulario && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { position: "relative" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Subdivisao *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              placeholder: "Digite a subdivisao",
              value: subdivisaoBusca,
              onChange: (e) => handleSubdivisaoBusca(e.target.value),
              onFocus: () => setMostrarSugestoesSubdivisao(true),
              onBlur: () => setTimeout(() => setMostrarSugestoesSubdivisao(false), 150),
              required: true
            }
          ),
          mostrarSugestoesSubdivisao && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "card-base",
              style: {
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 20,
                maxHeight: 200,
                overflowY: "auto",
                padding: 6,
                marginTop: 4,
                border: "1px solid #e5e7eb",
                background: "#fff"
              },
              children: [
                subdivisoesFiltradas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "4px 6px", color: "#6b7280" }, children: "Nenhuma subdivisao encontrada." }),
                subdivisoesFiltradas.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "btn btn-light",
                    style: {
                      width: "100%",
                      justifyContent: "flex-start",
                      marginBottom: 4,
                      background: form.subdivisao_id === s.id ? "#e0f2fe" : "#fff",
                      borderColor: form.subdivisao_id === s.id ? "#38bdf8" : "#e5e7eb"
                    },
                    onMouseDown: (e) => {
                      e.preventDefault();
                      handleChange("subdivisao_id", s.id);
                      setSubdivisaoBusca(s.label || s.nome);
                      setMostrarSugestoesSubdivisao(false);
                    },
                    children: s.label || s.nome
                  },
                  s.id
                ))
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: fecharFormulario, disabled: salvando, children: "Cancelar" })
      ] })
    ] }) }),
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
