globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_wZGzgon3.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/systemName_Co0aCFY_.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_Chx8mpdX.mjs';
import { r as registrarLog } from '../../chunks/logs_BveZ35Xh.mjs';
import { t as titleCaseWithExceptions } from '../../chunks/titleCase_DEDuDeMf.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_CGEPCHFN.mjs';

const initialForm = {
  nome: "",
  nascimento: "",
  cpf: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  numero: "",
  complemento: "",
  cidade: "",
  estado: "",
  cep: "",
  rg: "",
  genero: "",
  nacionalidade: "",
  tags: "",
  tipo_cliente: "passageiro",
  company_id: "",
  notas: "",
  ativo: true,
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
  const [companyId, setCompanyId] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState(initialForm);
  const [editId, setEditId] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [historicoCliente, setHistoricoCliente] = reactExports.useState(null);
  const [cepStatus, setCepStatus] = reactExports.useState(null);
  const [mostrarFormAcomp, setMostrarFormAcomp] = reactExports.useState(false);
  const [msg, setMsg] = reactExports.useState(null);
  const [mostrarFormCliente, setMostrarFormCliente] = reactExports.useState(false);
  const [historicoVendas, setHistoricoVendas] = reactExports.useState([]);
  const [historicoOrcamentos, setHistoricoOrcamentos] = reactExports.useState([]);
  const [loadingHistorico, setLoadingHistorico] = reactExports.useState(false);
  const [detalheVenda, setDetalheVenda] = reactExports.useState(null);
  const [detalheRecibos, setDetalheRecibos] = reactExports.useState([]);
  const [carregandoRecibos, setCarregandoRecibos] = reactExports.useState(false);
  const [detalheOrcamento, setDetalheOrcamento] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let isMounted = true;
    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user = sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !isMounted) return;
        const { data, error } = await supabase.from("users").select("company_id").eq("id", user.id).maybeSingle();
        if (!isMounted) return;
        if (error) {
          console.error("Erro ao buscar company_id dos clientes:", error);
          return;
        }
        setCompanyId(data?.company_id || null);
      } catch (error) {
        console.error("Erro ao determinar company_id dos clientes:", error);
      }
    }
    resolveCompany();
    return () => {
      isMounted = false;
    };
  }, []);
  const [acompanhantes, setAcompanhantes] = reactExports.useState([]);
  const [acompLoading, setAcompLoading] = reactExports.useState(false);
  const [acompErro, setAcompErro] = reactExports.useState(null);
  const [acompForm, setAcompForm] = reactExports.useState({
    nome_completo: "",
    cpf: "",
    telefone: "",
    grau_parentesco: "",
    rg: "",
    data_nascimento: "",
    observacoes: "",
    ativo: true
  });
  const [acompEditId, setAcompEditId] = reactExports.useState(null);
  const [acompSalvando, setAcompSalvando] = reactExports.useState(false);
  const [acompExcluindo, setAcompExcluindo] = reactExports.useState(null);
  async function carregar() {
    if (!podeVer || !companyId) return;
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase.from("clientes").select("*, company_id").eq("company_id", companyId).order("nome", { ascending: true });
      if (error) throw error;
      setClientes(data || []);
      setAcompanhantes([]);
      setAcompErro(null);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (!loadPerm && podeVer && companyId) {
      carregar();
    }
  }, [loadPerm, podeVer, companyId]);
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
  function formatCpf(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  function formatTelefone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
  function formatCep(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, "$1-$2");
  }
  async function buscarCepIfNeeded(cepRaw) {
    const digits = (cepRaw || "").replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepStatus(null);
      return;
    }
    try {
      setCepStatus("Buscando endereço...");
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { mode: "cors" });
      if (!resp.ok) throw new Error("CEP inválido ou indisponível.");
      const data = await resp.json();
      if (data.erro) throw new Error("CEP não encontrado.");
      setForm((prev) => ({
        ...prev,
        cep: formatCep(digits),
        endereco: data.logradouro || "",
        cidade: data.localidade || "",
        estado: data.uf || ""
      }));
      setCepStatus("Endereço carregado pelo CEP.");
    } catch (e) {
      console.error("Erro ao buscar CEP:", e);
      setCepStatus("Não foi possível carregar o CEP.");
    }
  }
  function fecharFormularioCliente() {
    setMostrarFormCliente(false);
    setForm(initialForm);
    setEditId(null);
    setMsg(null);
  }
  async function abrirHistorico(cliente) {
    setHistoricoCliente(cliente);
    setLoadingHistorico(true);
    const produtoIdsSet = /* @__PURE__ */ new Set();
    try {
      const { data: viagens } = await supabase.from("historico_viagens_real").select("id, data_viagem, valor_total, notas, destinos:produtos!destino_id (nome)").eq("cliente_id", cliente.id).order("data_viagem", { ascending: false });
      const viagensFmt = viagens?.map((v) => ({
        id: v.id,
        data_viagem: v.data_viagem,
        destino_nome: v.destinos?.nome || "",
        valor_total: v.valor_total ?? null,
        notas: v.notas || null
      })) || [];
      const { data: vendasData } = await supabase.from("vendas").select("id, data_lancamento, data_embarque, destino_id, destino_cidade_id, destinos:produtos!destino_id (nome, cidade_id)").eq("cliente_id", cliente.id).order("data_lancamento", { ascending: false });
      let vendasFmt = [];
      let cidadesMap2 = {};
      if (vendasData && vendasData.length > 0) {
        const vendaIds = vendasData.map((v) => v.id);
        const cidadeIds = Array.from(
          new Set(
            vendasData.map((v) => v.destino_cidade_id || v.destinos?.cidade_id).filter((id) => Boolean(id))
          )
        );
        if (cidadeIds.length > 0) {
          const { data: cidadesData, error: cidadesErr } = await supabase.from("cidades").select("id, nome").in("id", cidadeIds);
          if (!cidadesErr) {
            cidadesMap2 = Object.fromEntries((cidadesData || []).map((c) => [c.id, c.nome || ""]));
          } else {
            console.error(cidadesErr);
          }
        }
        const { data: recs } = await supabase.from("vendas_recibos").select("venda_id, valor_total, valor_taxas, produto_id").in("venda_id", vendaIds);
        (recs || []).forEach((r) => {
          if (r.produto_id) produtoIdsSet.add(r.produto_id);
        });
        let produtosLista = [];
        let tipoProdMap2 = {};
        if (produtoIdsSet.size > 0) {
          const idsArr = Array.from(produtoIdsSet);
          const { data: produtosData, error: prodErr } = await supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").in("tipo_produto", idsArr);
          if (!prodErr && produtosData) produtosLista = produtosData;
          else if (prodErr) console.error(prodErr);
          const { data: tiposData, error: tipoErr } = await supabase.from("tipo_produtos").select("id, nome").in("id", idsArr);
          if (!tipoErr && tiposData) {
            tipoProdMap2 = Object.fromEntries(
              tiposData.map((t) => [t.id, t.nome || "Produto"])
            );
          } else if (tipoErr) {
            console.error(tipoErr);
          }
        }
        const resolveProdutoNome2 = (produtoId, cidadeVenda) => {
          if (!produtoId) return "";
          const candidato = produtosLista.find((p) => {
            const ehGlobal = !!p?.todas_as_cidades;
            return p.tipo_produto === produtoId && (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda);
          });
          const tipoInfo = tipoProdMap2[produtoId] || {};
          return candidato?.nome || tipoInfo || "Produto";
        };
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
          const cidadeVendaId = v.destino_cidade_id || v.destinos?.cidade_id || null;
          const produtosVenda = recForVenda.map((r) => resolveProdutoNome2(r.produto_id, cidadeVendaId || void 0)).filter(Boolean);
          const cidadeVendaNome = cidadeVendaId ? cidadesMap2[cidadeVendaId] || "" : "";
          return {
            id: v.id,
            data_lancamento: v.data_lancamento,
            data_embarque: v.data_embarque,
            destino_nome: v.destinos?.nome || "",
            destino_cidade_id: cidadeVendaId,
            destino_cidade_nome: cidadeVendaNome,
            valor_total: total,
            valor_taxas: taxas,
            produtos: produtosVenda
          };
        });
      }
      const { data: orc } = await supabase.from("orcamentos").select("id, data_orcamento, status, valor, numero_venda, produto_id, destinos:produtos!destino_id (nome, cidade_id)").eq("cliente_id", cliente.id).order("data_orcamento", { ascending: false });
      const extraCidadeIds = orc?.map((o) => o.destinos?.cidade_id).filter((id) => Boolean(id)) || [];
      const novasCidades = extraCidadeIds.filter((id) => !(id in (cidadesMap2 || {})));
      if (novasCidades.length > 0) {
        const { data: cidadesExtras, error: cidadeExtraErr } = await supabase.from("cidades").select("id, nome").in("id", novasCidades);
        if (!cidadeExtraErr) {
          (cidadesExtras || []).forEach((c) => {
            cidadesMap2[c.id] = c.nome || "";
          });
        } else {
          console.error(cidadeExtraErr);
        }
      }
      const produtoIdsOrc = orc?.map((o) => o.produto_id).filter((id) => Boolean(id)) || [];
      produtoIdsOrc.forEach((id) => produtoIdsSet.add(id));
      let produtosListaPorTipo = [];
      let produtosListaPorId = [];
      const produtoByIdMap = {};
      const produtoObjById = {};
      const tipoIdsSet = /* @__PURE__ */ new Set();
      let tipoProdMap = {};
      if (produtoIdsSet.size > 0) {
        const idsArr = Array.from(produtoIdsSet);
        const { data: produtosData, error: prodErr } = await supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").in("tipo_produto", idsArr);
        if (!prodErr && produtosData) produtosListaPorTipo = produtosData;
        else if (prodErr) console.error(prodErr);
        const { data: produtosPorId, error: prodIdErr } = await supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").in("id", idsArr);
        if (!prodIdErr && produtosPorId) {
          produtosListaPorId = produtosPorId;
          produtosPorId.forEach((p) => {
            if (p.id) {
              produtoByIdMap[p.id] = p.nome || "Produto";
              produtoObjById[p.id] = p;
            }
            if (p.tipo_produto) tipoIdsSet.add(p.tipo_produto);
          });
        } else if (prodIdErr) {
          console.error(prodIdErr);
        }
        produtosListaPorTipo.forEach((p) => {
          if (p.tipo_produto) tipoIdsSet.add(p.tipo_produto);
        });
        idsArr.forEach((id) => tipoIdsSet.add(id));
        const { data: tiposData, error: tipoErr } = await supabase.from("tipo_produtos").select("id, nome").in("id", Array.from(tipoIdsSet));
        if (!tipoErr && tiposData) {
          tipoProdMap = Object.fromEntries(
            tiposData.map((t) => [t.id, t.nome || "Produto"])
          );
        } else if (tipoErr) {
          console.error(tipoErr);
        }
      }
      const resolveProdutoNome = (produtoId, cidadeVenda) => {
        if (!produtoId) return "";
        if (produtoObjById[produtoId]) {
          const p = produtoObjById[produtoId];
          const ehGlobal = !!p?.todas_as_cidades;
          if (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda) return p.nome || "Produto";
        }
        if (produtoByIdMap[produtoId]) return produtoByIdMap[produtoId];
        const candidato = produtosListaPorTipo.find((p) => {
          const ehGlobal = !!p?.todas_as_cidades;
          return p.tipo_produto === produtoId && (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda);
        });
        const tipoNome = tipoProdMap[produtoId] || "Produto";
        return candidato?.nome || tipoNome;
      };
      if (vendasFmt.length > 0) {
        vendasFmt = vendasFmt.map((v) => ({
          ...v,
          produtos: (v.produtos || []).map((pid) => resolveProdutoNome(pid, v.destino_cidade_id)).filter(Boolean)
        }));
      }
      const orcFmt = orc?.map((o) => ({
        id: o.id,
        data_orcamento: o.data_orcamento,
        status: o.status,
        valor: o.valor ?? null,
        numero_venda: o.numero_venda ?? null,
        destino_nome: o.destinos?.nome || null,
        destino_cidade_nome: o.destinos?.cidade_id ? cidadesMap2[o.destinos?.cidade_id] || "" : null,
        produto_nome: resolveProdutoNome(o.produto_id, o.destinos?.cidade_id)
      })) || [];
      setHistoricoVendas(vendasFmt);
      setHistoricoOrcamentos(orcFmt);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar histórico do cliente.");
    } finally {
      setLoadingHistorico(false);
      carregarAcompanhantes(cliente.id);
    }
  }
  async function carregarAcompanhantes(clienteId) {
    try {
      setAcompLoading(true);
      setAcompErro(null);
      const { data, error } = await supabase.from("cliente_acompanhantes").select("*").eq("cliente_id", clienteId).order("nome_completo", { ascending: true });
      if (error) throw error;
      setAcompanhantes(data || []);
    } catch (e) {
      console.error(e);
      setAcompErro("Erro ao carregar acompanhantes.");
      setAcompanhantes([]);
    } finally {
      setAcompLoading(false);
    }
  }
  function fecharHistorico() {
    setHistoricoCliente(null);
    setHistoricoVendas([]);
    setHistoricoOrcamentos([]);
    setDetalheVenda(null);
    setDetalheRecibos([]);
    setDetalheOrcamento(null);
    setAcompanhantes([]);
    setAcompErro(null);
    resetAcompForm(true);
  }
  async function verDetalheVenda(v) {
    setDetalheVenda(v);
    setCarregandoRecibos(true);
    setDetalheRecibos([]);
    try {
      const { data } = await supabase.from("vendas_recibos").select("id, numero_recibo, valor_total, valor_taxas, produto_id").eq("venda_id", v.id);
      const recsBase = (data || []).map((r) => ({
        id: r.id,
        numero_recibo: r.numero_recibo,
        valor_total: r.valor_total,
        valor_taxas: r.valor_taxas,
        produto_id: r.produto_id,
        produto_nome: null
      })) || [];
      const produtoIds = Array.from(
        new Set(
          recsBase.map((r) => r.produto_id).filter((id) => Boolean(id))
        )
      );
      const cidadeVenda = v.destino_cidade_id || "";
      let produtosListaPorTipo = [];
      let tipoProdMap = {};
      if (produtoIds.length > 0) {
        const { data: produtosData, error: prodErr } = await supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").in("tipo_produto", produtoIds);
        if (!prodErr && produtosData) produtosListaPorTipo = produtosData;
        else if (prodErr) console.error(prodErr);
        const { data: tiposData, error: tipoErr } = await supabase.from("tipo_produtos").select("id, nome").in("id", produtoIds);
        if (!tipoErr && tiposData) {
          tipoProdMap = Object.fromEntries(
            tiposData.map((t) => [t.id, t.nome || "Produto"])
          );
        } else if (tipoErr) {
          console.error(tipoErr);
        }
      }
      const resolveProdutoNome = (produtoId) => {
        if (!produtoId) return "";
        const candidato = produtosListaPorTipo.find((p) => {
          const ehGlobal = !!p?.todas_as_cidades;
          return p.tipo_produto === produtoId && (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda);
        });
        const tipoNome = tipoProdMap[produtoId] || "Produto";
        return candidato?.nome || tipoNome;
      };
      setDetalheRecibos(
        recsBase.map((r) => ({
          ...r,
          produto_nome: resolveProdutoNome(r.produto_id)
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
      numero: c.numero || "",
      complemento: c.complemento || "",
      cidade: c.cidade || "",
      estado: c.estado || "",
      cep: c.cep || "",
      rg: c.rg || "",
      genero: c.genero || "",
      nacionalidade: c.nacionalidade || "",
      tags: (c.tags || []).join(", "),
      tipo_cliente: c.tipo_cliente || "passageiro",
      company_id: c.company_id || "",
      notas: c.notas || "",
      ativo: c.ativo,
      active: c.active
    });
    carregarAcompanhantes(c.id);
    setMostrarFormCliente(true);
  }
  async function salvar(e) {
    e.preventDefault();
    if (!podeCriar && !podeEditar) return;
    try {
      setSalvando(true);
      setErro(null);
      setMsg(null);
      const nomeNormalizado = titleCaseWithExceptions(form.nome);
      const payload = {
        nome: nomeNormalizado,
        nascimento: form.nascimento || null,
        cpf: form.cpf.trim(),
        telefone: form.telefone.trim(),
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        endereco: form.endereco.trim() || null,
        numero: form.numero.trim() || null,
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
        ativo: form.ativo,
        active: form.active
      };
      const trimmedCompanyId = form.company_id.trim();
      if (trimmedCompanyId) {
        payload.company_id = trimmedCompanyId;
      } else if (historicoCliente?.company_id) {
        payload.company_id = historicoCliente.company_id;
      } else if (companyId) {
        payload.company_id = companyId;
      }
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
      setMostrarFormCliente(false);
      setMsg(editId ? "Cliente atualizado com sucesso." : "Cliente criado com sucesso.");
      await carregar();
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar cliente.");
      setMsg(null);
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
  function resetAcompForm(hideForm = false) {
    setAcompForm({
      nome_completo: "",
      cpf: "",
      telefone: "",
      grau_parentesco: "",
      rg: "",
      data_nascimento: "",
      observacoes: "",
      ativo: true
    });
    setAcompEditId(null);
    if (hideForm) {
      setMostrarFormAcomp(false);
    }
  }
  function iniciarEdicaoAcomp(a) {
    setAcompEditId(a.id);
    setAcompForm({
      nome_completo: a.nome_completo || "",
      cpf: a.cpf || "",
      telefone: a.telefone || "",
      grau_parentesco: a.grau_parentesco || "",
      rg: a.rg || "",
      data_nascimento: a.data_nascimento || "",
      observacoes: a.observacoes || "",
      ativo: a.ativo
    });
    setMostrarFormAcomp(true);
  }
  async function salvarAcompanhante() {
    if (!historicoCliente) {
      setAcompErro("Selecione um cliente antes de salvar acompanhante.");
      return;
    }
    const companyId2 = historicoCliente.company_id || null;
    if (!companyId2) {
      setAcompErro("Cliente sem company_id definido para salvar acompanhante.");
      return;
    }
    const payload = {
      cliente_id: historicoCliente.id,
      company_id: companyId2,
      nome_completo: acompForm.nome_completo.trim(),
      cpf: acompForm.cpf?.trim() || null,
      telefone: acompForm.telefone?.trim() || null,
      grau_parentesco: acompForm.grau_parentesco?.trim() || null,
      rg: acompForm.rg?.trim() || null,
      data_nascimento: acompForm.data_nascimento || null,
      observacoes: acompForm.observacoes?.trim() || null,
      ativo: acompForm.ativo
    };
    if (!payload.nome_completo) {
      setAcompErro("Informe o nome completo do acompanhante.");
      return;
    }
    try {
      setAcompSalvando(true);
      setAcompErro(null);
      if (acompEditId) {
        const { error } = await supabase.from("cliente_acompanhantes").update(payload).eq("id", acompEditId).eq("cliente_id", historicoCliente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cliente_acompanhantes").insert(payload);
        if (error) throw error;
      }
      resetAcompForm(true);
      await carregarAcompanhantes(historicoCliente.id);
    } catch (e) {
      console.error(e);
      setAcompErro("Erro ao salvar acompanhante.");
    } finally {
      setAcompSalvando(false);
    }
  }
  async function excluirAcompanhante(id) {
    if (!podeExcluir || !historicoCliente) return;
    if (!window.confirm("Remover acompanhante?")) return;
    try {
      setAcompExcluindo(id);
      setAcompErro(null);
      const { error } = await supabase.from("cliente_acompanhantes").delete().eq("id", id).eq("cliente_id", historicoCliente.id);
      if (error) throw error;
      if (acompEditId === id) resetAcompForm(true);
      await carregarAcompanhantes(historicoCliente.id);
    } catch (e) {
      console.error(e);
      setAcompErro("Erro ao remover acompanhante.");
    } finally {
      setAcompExcluindo(null);
    }
  }
  if (loadPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Acesso negado ao módulo de Clientes." }) });
  }
  const modoSomenteLeitura = !podeCriar && !podeEditar;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "clientes-page", children: [
      !modoSomenteLeitura && mostrarFormCliente && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: editId ? "Editar cliente" : "Novo cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "form-row",
            style: {
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) repeat(5, minmax(0, 1fr))",
              gap: 12
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome completo *" }),
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
                    onChange: (e) => handleChange("cpf", formatCpf(e.target.value)),
                    required: true
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "RG" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.rg,
                    onChange: (e) => handleChange("rg", e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nascimento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "date",
                    className: "form-input",
                    value: form.nascimento,
                    onChange: (e) => handleChange("nascimento", e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Gênero" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    className: "form-select",
                    value: form.genero,
                    onChange: (e) => handleChange("genero", e.target.value),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Masculino", children: "Masculino" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Feminino", children: "Feminino" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Outros", children: "Outros" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nacionalidade" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.nacionalidade,
                    onChange: (e) => handleChange("nacionalidade", e.target.value)
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "form-row",
            style: {
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Telefone *" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.telefone,
                    onChange: (e) => handleChange("telefone", formatTelefone(e.target.value))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Whatsapp" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.whatsapp,
                    onChange: (e) => handleChange("whatsapp", formatTelefone(e.target.value))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "E-mail" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.email,
                    onChange: (e) => handleChange("email", e.target.value)
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "form-row",
            style: {
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "minmax(0, 0.75fr) minmax(0, 1.7fr) minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 0.9fr)",
              gap: 12
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "CEP" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.cep,
                    onChange: (e) => handleChange("cep", formatCep(e.target.value)),
                    onBlur: (e) => {
                      const val = formatCep(e.target.value);
                      handleChange("cep", val);
                      if (val.replace(/\D/g, "").length === 8) {
                        buscarCepIfNeeded(val);
                      } else {
                        setCepStatus(null);
                      }
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: cepStatus?.includes("Não foi") ? "#b91c1c" : "#475569" }, children: cepStatus || "Preencha para auto-preencher endereço." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Endereço" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.endereco,
                    onChange: (e) => handleChange("endereco", e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Número" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.numero,
                    onChange: (e) => handleChange("numero", e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Complemento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.complemento,
                    onChange: (e) => handleChange("complemento", e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.cidade,
                    onChange: (e) => handleChange("cidade", e.target.value)
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Estado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    className: "form-input",
                    value: form.estado,
                    onChange: (e) => handleChange("estado", e.target.value)
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Notas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              className: "form-textarea",
              rows: 3,
              value: form.notas,
              onChange: (e) => handleChange("notas", e.target.value),
              placeholder: "Informações adicionais"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-primary",
              disabled: salvando,
              type: "submit",
              children: salvando ? "Salvando..." : editId ? "Salvar alterações" : "Salvar"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-light",
              onClick: fecharFormularioCliente,
              disabled: salvando,
              children: "Cancelar"
            }
          )
        ] })
      ] }) }),
      msg && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-green mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: msg }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "form-row",
          style: {
            marginTop: 12,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end"
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: "1 1 300px" }, children: [
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
            ] }),
            podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", style: { alignItems: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn-primary",
                onClick: () => {
                  setForm(initialForm);
                  setEditId(null);
                  setMsg(null);
                  setMostrarFormCliente(true);
                },
                disabled: mostrarFormCliente,
                children: "Adicionar cliente"
              }
            ) })
          ]
        }
      ) }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[960px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CPF" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Telefone" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "E-mail" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Ativo" }),
          (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", style: { textAlign: "center" }, children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Carregando..." }) }),
          !loading && filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhum cliente encontrado." }) }),
          !loading && filtrados.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.cpf }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.telefone }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.email || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textAlign: "center" }, children: c.active ? "Sim" : "Não" }),
            (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", style: { textAlign: "center" }, children: [
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
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "modal-title",
              style: { color: "#1d4ed8", fontSize: "1.2rem", fontWeight: 800 },
              children: [
                "Histórico de ",
                historicoCliente.nome
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Vendas e orçamentos do cliente" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: fecharHistorico, children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
        loadingHistorico && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Carregando histórico..." }),
        !loadingHistorico && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginBottom: 8 }, children: "Acompanhantes do cliente" }),
            acompErro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "red", marginBottom: 8 }, children: acompErro }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[720px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CPF" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Telefone" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Parentesco" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
                (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", style: { textAlign: "center" }, children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                acompLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Carregando acompanhantes..." }) }),
                !acompLoading && acompanhantes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhum acompanhante cadastrado." }) }),
                !acompLoading && acompanhantes.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.nome_completo }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.cpf || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.telefone || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.grau_parentesco || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: a.ativo ? "Sim" : "Não" }),
                  (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", style: { textAlign: "center", display: "flex", gap: 6, justifyContent: "center" }, children: [
                    podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", type: "button", onClick: () => iniciarEdicaoAcomp(a), title: "Editar", children: "✏️" }),
                    podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "btn-icon btn-danger",
                        type: "button",
                        onClick: () => excluirAcompanhante(a.id),
                        disabled: acompExcluindo === a.id,
                        title: "Excluir",
                        children: acompExcluindo === a.id ? "..." : "🗑️"
                      }
                    )
                  ] })
                ] }, a.id))
              ] })
            ] }) }),
            podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { marginTop: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600, marginBottom: 8 }, children: acompEditId ? "Editar acompanhante" : "Adicionar acompanhante" }),
              !mostrarFormAcomp && !acompEditId && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "btn btn-primary",
                  onClick: () => {
                    resetAcompForm();
                    setMostrarFormAcomp(true);
                  },
                  children: "Adicionar acompanhante"
                }
              ),
              (mostrarFormAcomp || acompEditId) && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome completo" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        className: "form-input",
                        value: acompForm.nome_completo,
                        onChange: (e) => setAcompForm((prev) => ({ ...prev, nome_completo: e.target.value }))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "CPF" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        className: "form-input",
                        value: acompForm.cpf,
                        onChange: (e) => setAcompForm((prev) => ({ ...prev, cpf: e.target.value }))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Telefone" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        className: "form-input",
                        value: acompForm.telefone,
                        onChange: (e) => setAcompForm((prev) => ({ ...prev, telefone: e.target.value }))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Parentesco" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        className: "form-input",
                        value: acompForm.grau_parentesco,
                        onChange: (e) => setAcompForm((prev) => ({ ...prev, grau_parentesco: e.target.value })),
                        placeholder: "Ex: Esposa, Filho"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "RG" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        className: "form-input",
                        value: acompForm.rg,
                        onChange: (e) => setAcompForm((prev) => ({ ...prev, rg: e.target.value }))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data nascimento" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "date",
                        className: "form-input",
                        value: acompForm.data_nascimento,
                        onChange: (e) => setAcompForm((prev) => ({ ...prev, data_nascimento: e.target.value }))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Observações" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        className: "form-input",
                        value: acompForm.observacoes,
                        onChange: (e) => setAcompForm((prev) => ({ ...prev, observacoes: e.target.value }))
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { alignSelf: "flex-end" }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativo" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "checkbox",
                        checked: acompForm.ativo,
                        onChange: (e) => setAcompForm((prev) => ({ ...prev, ativo: e.target.checked }))
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, marginTop: 8 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "button", onClick: salvarAcompanhante, disabled: acompSalvando, children: acompSalvando ? "Salvando..." : acompEditId ? "Salvar alterações" : "Salvar" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "btn btn-light",
                      type: "button",
                      onClick: () => resetAcompForm(true),
                      disabled: acompSalvando,
                      children: "Cancelar"
                    }
                  )
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginBottom: 8 }, children: "Vendas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[820px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data Lançamento" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Embarque" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", style: { textAlign: "center" }, children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                historicoVendas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhuma venda encontrada." }) }),
                historicoVendas.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_lancamento ? new Date(v.data_lancamento).toLocaleDateString("pt-BR") : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.destino_cidade_nome || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_embarque ? new Date(v.data_embarque).toLocaleDateString("pt-BR") : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.valor_total.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.valor_taxas.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", style: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
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
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Venda" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", style: { textAlign: "center" }, children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                historicoOrcamentos.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Nenhum orçamento encontrado." }) }),
                historicoOrcamentos.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.data_orcamento ? new Date(o.data_orcamento).toLocaleDateString("pt-BR").replaceAll("/", "-") : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textTransform: "capitalize" }, children: o.status || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.destino_cidade_nome || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.produto_nome || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: (o.valor ?? 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.numero_venda || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", style: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "modal-title",
            style: { color: "#16a34a", fontSize: "1.15rem", fontWeight: 800 },
            children: "Detalhes da venda"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: () => {
          setDetalheVenda(null);
          setDetalheRecibos([]);
        }, children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "grid",
              gap: 6,
              lineHeight: 1.4,
              marginBottom: 8
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Recibo:" }),
                " ",
                detalheRecibos.length > 0 ? detalheRecibos.map((r) => r.numero_recibo || "-").join(", ") : "—"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Destino:" }),
                " ",
                detalheVenda.destino_cidade_nome || "-"
              ] }),
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
                detalheVenda.valor_taxas === 0 ? "-" : detalheVenda.valor_taxas.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginBottom: 8, textAlign: "center" }, children: "Recibos" }),
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
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "modal-title",
              style: { color: "#1d4ed8", fontSize: "1.15rem", fontWeight: 800 },
              children: "Detalhes do orçamento"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { style: { color: "#64748b" }, children: [
            "Destino: ",
            detalheOrcamento.destino_nome || "-"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: () => setDetalheOrcamento(null), children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-body", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          style: {
            display: "grid",
            gap: 6,
            lineHeight: 1.4,
            marginBottom: 4
          },
          children: [
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
          ]
        }
      ) }),
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
