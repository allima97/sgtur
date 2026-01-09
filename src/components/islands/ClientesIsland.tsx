import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { construirLinkWhatsApp } from "../../lib/whatsapp";

type Cliente = {
  id: string;
  nome: string;
  nascimento: string | null;
  cpf: string;
  telefone: string;
  whatsapp: string | null;
  email: string | null;
  classificacao: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  rg: string | null;
  genero: string | null;
  nacionalidade: string | null;
  tags: string[] | null;
  tipo_cliente: string | null;
  notas: string | null;
  ativo: boolean;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
  company_id?: string | null;
};

type Acompanhante = {
  id: string;
  nome_completo: string;
  cpf: string | null;
  telefone: string | null;
  grau_parentesco: string | null;
  rg?: string | null;
  data_nascimento?: string | null;
  observacoes?: string | null;
  ativo: boolean;
};

const initialForm = {
  nome: "",
  nascimento: "",
  cpf: "",
  telefone: "",
  whatsapp: "",
  email: "",
  classificacao: "",
  endereco: "",
  numero: "",
  complemento: "",
  cidade: "",
  estado: "",
  cep: "",
  rg: "",
  genero: "",
  nacionalidade: "Brasileira",
  tags: "",
  tipo_cliente: "passageiro",
  company_id: "",
  notas: "",
  ativo: true,
  active: true,
};

export default function ClientesIsland() {
  // =====================================
  // PERMISSÕES
  // =====================================
  const { permissao, ativo, loading: loadPerm, isAdmin } = usePermissao("Clientes");

  const podeVer =
    permissao !== "none";
  const podeCriar =
    permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar =
    permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir =
    permissao === "delete" || permissao === "admin";
  const exibeColunaAcoes = podeVer;

  // =====================================
  // STATES
  // =====================================
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [historicoCliente, setHistoricoCliente] = useState<Cliente | null>(null);
  const [cepStatus, setCepStatus] = useState<string | null>(null);
  const [mostrarFormAcomp, setMostrarFormAcomp] = useState(false);
  const [abaFormCliente, setAbaFormCliente] = useState<"dados" | "acompanhantes">("dados");
  const [msg, setMsg] = useState<string | null>(null);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [historicoVendas, setHistoricoVendas] = useState<
    {
      id: string;
      data_lancamento: string;
      data_embarque: string | null;
      destino_nome: string;
      destino_cidade_id?: string | null;
      destino_cidade_nome?: string;
      valor_total: number;
      valor_taxas: number;
      produtos?: string[];
    }[]
  >([]);
  const [historicoOrcamentos, setHistoricoOrcamentos] = useState<
    {
      id: string;
      data_orcamento: string | null;
      status: string | null;
      valor: number | null;
      numero_venda: string | null;
      destino_nome: string | null;
      destino_cidade_nome?: string | null;
      produto_nome?: string | null;
    }[]
  >([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [detalheVenda, setDetalheVenda] = useState<{
    id: string;
    data_lancamento: string;
    data_embarque: string | null;
    destino_nome: string;
    destino_cidade_id?: string | null;
    destino_cidade_nome?: string;
    valor_total: number;
    valor_taxas: number;
  } | null>(null);
  const [detalheRecibos, setDetalheRecibos] = useState<
    {
      id?: string;
      numero_recibo: string | null;
      valor_total: number | null;
      valor_taxas: number | null;
      produto_nome: string | null;
      produto_id?: string | null;
    }[]
  >([]);
  const [carregandoRecibos, setCarregandoRecibos] = useState(false);
  const [detalheOrcamento, setDetalheOrcamento] = useState<{
    id: string;
    data_orcamento: string | null;
    status: string | null;
    destino_nome: string | null;
    valor: number | null;
    numero_venda: string | null;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user =
          sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !isMounted) return;

        const { data, error } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();
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

  // Acompanhantes
  const [acompanhantes, setAcompanhantes] = useState<Acompanhante[]>([]);
  const [acompLoading, setAcompLoading] = useState(false);
  const [acompErro, setAcompErro] = useState<string | null>(null);
  const [acompForm, setAcompForm] = useState({
    nome_completo: "",
    cpf: "",
    telefone: "",
    grau_parentesco: "",
    rg: "",
    data_nascimento: "",
    observacoes: "",
    ativo: true,
  });
  const [acompEditId, setAcompEditId] = useState<string | null>(null);
  const [acompSalvando, setAcompSalvando] = useState(false);
  const [acompExcluindo, setAcompExcluindo] = useState<string | null>(null);

  // =====================================
  // CARREGAR CLIENTES
  // =====================================
  async function carregar() {
    if (!podeVer || !companyId) return;

    try {
      setLoading(true);
      setErro(null);

      const { data, error } = await supabase
        .from("clientes")
        .select("*, company_id")
        .eq("company_id", companyId)
        .order("nome", { ascending: true });

      if (error) throw error;

      setClientes((data || []) as Cliente[]);
      setAcompanhantes([]);
      setAcompErro(null);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadPerm && podeVer && companyId) {
      carregar();
    }
  }, [loadPerm, podeVer, companyId]);

  // =====================================
  // FILTRO
  // =====================================
  const filtrados = useMemo(() => {
    if (!busca.trim()) return clientes;
    const t = busca.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(t) ||
        (c.cpf || "").includes(t) ||
        (c.email || "").toLowerCase().includes(t)
    );
  }, [clientes, busca]);

  // =====================================
  // FORM HANDLER
  // =====================================
  function handleChange(campo: string, valor: any) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function formatTelefone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function formatCep(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, "$1-$2");
  }

  async function buscarCepIfNeeded(cepRaw: string) {
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
        estado: data.uf || "",
      }));
      setCepStatus("Endereço carregado pelo CEP.");
    } catch (e) {
      console.error("Erro ao buscar CEP:", e);
      setCepStatus("Não foi possível carregar o CEP.");
    }
  }

  function iniciarNovo() {
    if (!podeCriar) return;
    setEditId(null);
    setForm(initialForm);
    setAcompanhantes([]);
    setAcompErro(null);
    setAcompEditId(null);
    setAbaFormCliente("dados");
    setMostrarFormAcomp(false);
    setMostrarFormCliente(false);
    setMsg(null);
  }

  function fecharFormularioCliente() {
    setMostrarFormCliente(false);
    setForm(initialForm);
    setEditId(null);
    setAbaFormCliente("dados");
    resetAcompForm(true);
    setMsg(null);
  }

  async function abrirHistorico(cliente: Cliente) {
    setHistoricoCliente(cliente);
    setLoadingHistorico(true);
    const cidadesMap: Record<string, string> = {};
    const produtoIdsSet: Set<string> = new Set();
    try {
      const { data: viagens } = await supabase
        .from("historico_viagens_real")
        .select("id, data_viagem, valor_total, notas, destinos:produtos!destino_id (nome)")
        .eq("cliente_id", cliente.id)
        .order("data_viagem", { ascending: false });

      const viagensFmt =
        viagens?.map((v: any) => ({
          id: v.id,
          data_viagem: v.data_viagem,
          destino_nome: v.destinos?.nome || "",
          valor_total: v.valor_total ?? null,
          notas: v.notas || null,
        })) || [];

      // Vendas e recibos
      const { data: vendasData } = await supabase
        .from("vendas")
        .select("id, data_lancamento, data_embarque, destino_id, destino_cidade_id, destinos:produtos!destino_id (nome, cidade_id)")
        .eq("cliente_id", cliente.id)
        .order("data_lancamento", { ascending: false });

      let vendasFmt = [];
      let cidadesMap: Record<string, string> = {};

      if (vendasData && vendasData.length > 0) {
        const vendaIds = vendasData.map((v: any) => v.id);
        const cidadeIds = Array.from(
          new Set(
            vendasData
              .map((v: any) => v.destino_cidade_id || v.destinos?.cidade_id)
              .filter((id: string | null | undefined): id is string => Boolean(id))
          )
        );
        if (cidadeIds.length > 0) {
          const { data: cidadesData, error: cidadesErr } = await supabase
            .from("cidades")
            .select("id, nome")
            .in("id", cidadeIds);
          if (!cidadesErr) {
            cidadesMap = Object.fromEntries((cidadesData || []).map((c: any) => [c.id, c.nome || ""]));
          } else {
            console.error(cidadesErr);
          }
        }
        const { data: recs } = await supabase
          .from("vendas_recibos")
          .select("venda_id, valor_total, valor_taxas, produto_id")
          .in("venda_id", vendaIds);

        (recs || []).forEach((r: any) => {
          if (r.produto_id) produtoIdsSet.add(r.produto_id);
        });

        let produtosLista: any[] = [];
        let tipoProdMap: Record<string, string> = {};
        if (produtoIdsSet.size > 0) {
          const idsArr = Array.from(produtoIdsSet);
          const { data: produtosData, error: prodErr } = await supabase
            .from("produtos")
            .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
            .in("tipo_produto", idsArr);
          if (!prodErr && produtosData) produtosLista = produtosData as any[];
          else if (prodErr) console.error(prodErr);

          const { data: tiposData, error: tipoErr } = await supabase
            .from("tipo_produtos")
            .select("id, nome")
            .in("id", idsArr);
          if (!tipoErr && tiposData) {
            tipoProdMap = Object.fromEntries(
              (tiposData as any[]).map((t) => [t.id, t.nome || "Produto"])
            );
          } else if (tipoErr) {
            console.error(tipoErr);
          }
        }

        const resolveProdutoNome = (produtoId?: string | null, cidadeVenda?: string | null) => {
          if (!produtoId) return "";
          const candidato = produtosLista.find((p) => {
            const ehGlobal = !!p?.todas_as_cidades;
            return p.tipo_produto === produtoId && (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda);
          });
          const tipoInfo = tipoProdMap[produtoId] || {};
          return candidato?.nome || tipoInfo || "Produto";
        };

        vendasFmt = vendasData.map((v: any) => {
          const recForVenda = (recs || []).filter((r: any) => r.venda_id === v.id);
          const total = recForVenda.reduce(
            (acc, r: any) => acc + (r.valor_total || 0),
            0
          );
          const taxas = recForVenda.reduce(
            (acc, r: any) => acc + (r.valor_taxas || 0),
            0
          );
          const cidadeVendaId = v.destino_cidade_id || v.destinos?.cidade_id || null;
          const produtosVenda = recForVenda
            .map((r: any) => resolveProdutoNome(r.produto_id, cidadeVendaId || undefined))
            .filter(Boolean);
          const cidadeVendaNome = cidadeVendaId ? cidadesMap[cidadeVendaId] || "" : "";
          return {
            id: v.id,
            data_lancamento: v.data_lancamento,
            data_embarque: v.data_embarque,
            destino_nome: v.destinos?.nome || "",
            destino_cidade_id: cidadeVendaId,
            destino_cidade_nome: cidadeVendaNome,
            valor_total: total,
            valor_taxas: taxas,
            produtos: produtosVenda,
          };
        });
      }

      const { data: orc } = await supabase
        .from("orcamentos")
        .select("id, data_orcamento, status, valor, numero_venda, produto_id, destinos:produtos!destino_id (nome, cidade_id)")
        .eq("cliente_id", cliente.id)
        .order("data_orcamento", { ascending: false });

      const extraCidadeIds =
        orc
          ?.map((o: any) => o.destinos?.cidade_id)
          .filter((id: string | null | undefined): id is string => Boolean(id)) || [];
      const novasCidades = extraCidadeIds.filter((id) => !(id in (cidadesMap || {})));
      if (novasCidades.length > 0) {
        const { data: cidadesExtras, error: cidadeExtraErr } = await supabase
          .from("cidades")
          .select("id, nome")
          .in("id", novasCidades);
        if (!cidadeExtraErr) {
          (cidadesExtras || []).forEach((c: any) => {
            cidadesMap[c.id] = c.nome || "";
          });
        } else {
          console.error(cidadeExtraErr);
        }
      }

      const produtoIdsOrc =
        orc
          ?.map((o: any) => o.produto_id)
          .filter((id: string | null | undefined): id is string => Boolean(id)) || [];
      produtoIdsOrc.forEach((id) => produtoIdsSet.add(id as string));

      let produtosListaPorTipo: any[] = [];
      let produtosListaPorId: any[] = [];
      const produtoByIdMap: Record<string, string> = {};
      const produtoObjById: Record<string, any> = {};
      const tipoIdsSet: Set<string> = new Set();
      let tipoProdMap: Record<string, string> = {};
      if (produtoIdsSet.size > 0) {
        const idsArr = Array.from(produtoIdsSet);
        const { data: produtosData, error: prodErr } = await supabase
          .from("produtos")
          .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
          .in("tipo_produto", idsArr);
        if (!prodErr && produtosData) produtosListaPorTipo = produtosData as any[];
        else if (prodErr) console.error(prodErr);

        const { data: produtosPorId, error: prodIdErr } = await supabase
          .from("produtos")
          .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
          .in("id", idsArr);
        if (!prodIdErr && produtosPorId) {
          produtosListaPorId = produtosPorId as any[];
          produtosPorId.forEach((p: any) => {
            if (p.id) {
              produtoByIdMap[p.id] = p.nome || "Produto";
              produtoObjById[p.id] = p;
            }
            if (p.tipo_produto) tipoIdsSet.add(p.tipo_produto);
          });
        } else if (prodIdErr) {
          console.error(prodIdErr);
        }

        produtosListaPorTipo.forEach((p: any) => {
          if (p.tipo_produto) tipoIdsSet.add(p.tipo_produto);
        });
        idsArr.forEach((id) => tipoIdsSet.add(id)); // cobre caso o recibo guarde o id do tipo direto

        const { data: tiposData, error: tipoErr } = await supabase
          .from("tipo_produtos")
          .select("id, nome")
          .in("id", Array.from(tipoIdsSet));
        if (!tipoErr && tiposData) {
          tipoProdMap = Object.fromEntries(
            (tiposData as any[]).map((t) => [t.id, t.nome || "Produto"])
          );
        } else if (tipoErr) {
          console.error(tipoErr);
        }
      }

      const resolveProdutoNome = (produtoId?: string | null, cidadeVenda?: string | null) => {
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
          produtos: (v.produtos || []).map((pid) => resolveProdutoNome(pid, v.destino_cidade_id)).filter(Boolean),
        }));
      }

      const orcFmt =
        orc?.map((o: any) => ({
          id: o.id,
          data_orcamento: o.data_orcamento,
          status: o.status,
          valor: o.valor ?? null,
          numero_venda: o.numero_venda ?? null,
          destino_nome: o.destinos?.nome || null,
          destino_cidade_nome: o.destinos?.cidade_id ? cidadesMap[o.destinos?.cidade_id] || "" : null,
          produto_nome: resolveProdutoNome(o.produto_id, o.destinos?.cidade_id),
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

  async function carregarAcompanhantes(clienteId: string) {
    try {
      setAcompLoading(true);
      setAcompErro(null);
      const { data, error } = await supabase
        .from("cliente_acompanhantes")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("nome_completo", { ascending: true });
      if (error) throw error;
      setAcompanhantes((data || []) as Acompanhante[]);
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

  async function verDetalheVenda(v: {
    id: string;
    data_lancamento: string;
    data_embarque: string | null;
    destino_nome: string;
    destino_cidade_id?: string | null;
    destino_cidade_nome?: string;
    valor_total: number;
    valor_taxas: number;
  }) {
    setDetalheVenda(v);
    setCarregandoRecibos(true);
    setDetalheRecibos([]);
    try {
      const { data } = await supabase
        .from("vendas_recibos")
        .select("id, numero_recibo, valor_total, valor_taxas, produto_id, data_inicio, data_fim")
        .eq("venda_id", v.id);
      const recsBase =
        (data || []).map((r: any) => ({
          id: r.id,
          numero_recibo: r.numero_recibo,
          valor_total: r.valor_total,
          valor_taxas: r.valor_taxas,
          produto_id: r.produto_id,
          produto_nome: null as string | null,
          data_inicio: r.data_inicio,
          data_fim: r.data_fim,
        })) || [];

      const produtoIds = Array.from(
        new Set(
          recsBase
            .map((r) => r.produto_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const cidadeVenda = v.destino_cidade_id || "";
      let produtosListaPorTipo: any[] = [];
      let tipoProdMap: Record<string, string> = {};

      if (produtoIds.length > 0) {
        const { data: produtosData, error: prodErr } = await supabase
          .from("produtos")
          .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
          .in("tipo_produto", produtoIds);
        if (!prodErr && produtosData) produtosListaPorTipo = produtosData as any[];
        else if (prodErr) console.error(prodErr);

        const { data: tiposData, error: tipoErr } = await supabase
          .from("tipo_produtos")
          .select("id, nome")
          .in("id", produtoIds);
        if (!tipoErr && tiposData) {
          tipoProdMap = Object.fromEntries(
            (tiposData as any[]).map((t) => [t.id, t.nome || "Produto"])
          );
        } else if (tipoErr) {
          console.error(tipoErr);
        }
      }

      const resolveProdutoNome = (produtoId?: string | null) => {
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
          produto_nome: resolveProdutoNome(r.produto_id),
        }))
      );
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar recibos da venda.");
    } finally {
      setCarregandoRecibos(false);
    }
  }

  function verDetalheOrcamento(o: {
    id: string;
    data_orcamento: string | null;
    status: string | null;
    valor: number | null;
    numero_venda: string | null;
    destino_nome: string | null;
  }) {
    setDetalheOrcamento(o);
  }

  function iniciarEdicao(c: Cliente) {
    if (!podeEditar) return;

    setEditId(c.id);
    setForm({
      nome: c.nome,
      nascimento: c.nascimento || "",
      cpf: c.cpf,
      telefone: c.telefone,
      whatsapp: c.whatsapp || "",
      email: c.email || "",
      classificacao: c.classificacao || "",
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
      active: c.active,
    });
    setAbaFormCliente("dados");
    resetAcompForm(true);
    carregarAcompanhantes(c.id);
    setMostrarFormCliente(true);
  }

  // =====================================
  // SALVAR CLIENTE
  // =====================================
  async function salvar(e: React.FormEvent) {
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
        classificacao: form.classificacao.trim() || null,
        endereco: form.endereco.trim() || null,
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        cep: form.cep.trim() || null,
        rg: form.rg.trim() || null,
        genero: form.genero.trim() || null,
        nacionalidade: form.nacionalidade.trim() || null,
        tags: form.tags
          ? form.tags.split(",").map((x) => x.trim())
          : [],
        tipo_cliente: form.tipo_cliente,
        notas: form.notas || null,
        ativo: form.ativo,
        active: form.active,
      };

      const trimmedCompanyId = form.company_id.trim();
      if (trimmedCompanyId) {
        (payload as any).company_id = trimmedCompanyId;
      } else if (historicoCliente?.company_id) {
        (payload as any).company_id = historicoCliente.company_id;
      } else if (companyId) {
        (payload as any).company_id = companyId;
      }

      if (editId) {
        const { error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", editId);

        if (error) throw error;

        await registrarLog({
          acao: "cliente_editado",
          modulo: "Clientes",
          detalhes: { id: editId, payload },
        });
      } else {
        const { error } = await supabase
          .from("clientes")
          .insert(payload);

        if (error) throw error;

        await registrarLog({
          acao: "cliente_criado",
          modulo: "Clientes",
          detalhes: payload,
        });
      }

      setForm(initialForm);
      setEditId(null);
      setMostrarFormCliente(false);
      setMsg(editId ? "Cliente atualizado com sucesso." : "Cliente criado com sucesso.");
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar cliente.");
      setMsg(null);
    } finally {
      setSalvando(false);
    }
  }

  // =====================================
  // EXCLUIR CLIENTE
  // =====================================
  async function excluir(id: string) {
    if (!podeExcluir) return;

    if (!window.confirm("Excluir cliente?")) return;

    try {
      setExcluindoId(id);

      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await registrarLog({
        acao: "cliente_excluido",
        modulo: "Clientes",
        detalhes: { id },
      });

      await carregar();
    } catch {
      setErro("Não foi possível excluir este cliente.");
    } finally {
      setExcluindoId(null);
    }
  }

  // =====================================
  // ACOMPANHANTES (CRUD)
  // =====================================
  function resetAcompForm(hideForm = false) {
    setAcompForm({
      nome_completo: "",
      cpf: "",
      telefone: "",
      grau_parentesco: "",
      rg: "",
      data_nascimento: "",
      observacoes: "",
      ativo: true,
    });
    setAcompEditId(null);
    if (hideForm) {
      setMostrarFormAcomp(false);
    }
  }

  function iniciarEdicaoAcomp(a: Acompanhante) {
    setAcompEditId(a.id);
    setAcompForm({
      nome_completo: a.nome_completo || "",
      cpf: a.cpf || "",
      telefone: a.telefone || "",
      grau_parentesco: a.grau_parentesco || "",
      rg: a.rg || "",
      data_nascimento: a.data_nascimento || "",
      observacoes: a.observacoes || "",
      ativo: a.ativo,
    });
    setMostrarFormAcomp(true);
  }

  async function salvarAcompanhante() {
    const clienteId = historicoCliente?.id || editId;
    const companyIdSelecionado =
      (historicoCliente as any)?.company_id ||
      form.company_id?.trim() ||
      clientes.find((c) => c.id === editId)?.company_id ||
      companyId ||
      null;

    if (!clienteId) {
      setAcompErro("Selecione um cliente antes de salvar acompanhante.");
      return;
    }
    if (!companyIdSelecionado) {
      setAcompErro("Cliente sem company_id definido para salvar acompanhante.");
      return;
    }
    const payload: any = {
      cliente_id: clienteId,
      company_id: companyIdSelecionado,
      nome_completo: acompForm.nome_completo.trim(),
      cpf: acompForm.cpf?.trim() || null,
      telefone: acompForm.telefone?.trim() || null,
      grau_parentesco: acompForm.grau_parentesco?.trim() || null,
      rg: acompForm.rg?.trim() || null,
      data_nascimento: acompForm.data_nascimento || null,
      observacoes: acompForm.observacoes?.trim() || null,
      ativo: acompForm.ativo,
    };
    if (!payload.nome_completo) {
      setAcompErro("Informe o nome completo do acompanhante.");
      return;
    }

    try {
      setAcompSalvando(true);
      setAcompErro(null);
      if (acompEditId) {
        const { error } = await supabase
          .from("cliente_acompanhantes")
          .update(payload)
          .eq("id", acompEditId)
          .eq("cliente_id", clienteId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cliente_acompanhantes")
          .insert(payload);
        if (error) throw error;
      }
      resetAcompForm(true);
      await carregarAcompanhantes(clienteId);
    } catch (e) {
      console.error(e);
      setAcompErro("Erro ao salvar acompanhante.");
    } finally {
      setAcompSalvando(false);
    }
  }

  async function excluirAcompanhante(id: string) {
    const clienteId = historicoCliente?.id || editId;
    if (!podeExcluir || !clienteId) return;
    if (!window.confirm("Remover acompanhante?")) return;
    try {
      setAcompExcluindo(id);
      setAcompErro(null);
      const { error } = await supabase
        .from("cliente_acompanhantes")
        .delete()
        .eq("id", id)
        .eq("cliente_id", clienteId);
      if (error) throw error;
      if (acompEditId === id) resetAcompForm(true);
      await carregarAcompanhantes(clienteId);
    } catch (e) {
      console.error(e);
      setAcompErro("Erro ao remover acompanhante.");
    } finally {
      setAcompExcluindo(null);
    }
  }

  // =====================================
  // RESTRIÇÃO TOTAL DE MÓDULO
  // =====================================
  if (loadPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return (
      <div className="card-base card-config">
        <strong>Acesso negado ao módulo de Clientes.</strong>
      </div>
    );
  }

  // =====================================
  // PERMISSÃO APENAS PARA VER (não mostra form)
  // =====================================
  const modoSomenteLeitura = !podeCriar && !podeEditar;
  const acompanhantesCard = (
    <div className="card-base card-blue mb-2">
      <h4 style={{ marginBottom: 8 }}>Acompanhantes do cliente</h4>
      {acompErro && (
        <div style={{ color: "red", marginBottom: 8 }}>{acompErro}</div>
      )}
      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[720px]">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Parentesco</th>
              <th>Ativo</th>
              {(podeEditar || podeExcluir) && (
                <th className="th-actions" style={{ textAlign: "center" }}>Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {acompLoading && (
              <tr>
                <td colSpan={6}>Carregando acompanhantes...</td>
              </tr>
            )}
            {!acompLoading && acompanhantes.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum acompanhante cadastrado.</td>
              </tr>
            )}
            {!acompLoading &&
              acompanhantes.map((a) => (
                <tr key={a.id}>
                  <td>{a.nome_completo}</td>
                  <td>{a.cpf || "-"}</td>
                  <td>{a.telefone || "-"}</td>
                  <td>{a.grau_parentesco || "-"}</td>
                  <td>{a.ativo ? "Sim" : "Não"}</td>
                  {(podeEditar || podeExcluir) && (
                    <td className="th-actions" style={{ textAlign: "center", display: "flex", gap: 6, justifyContent: "center" }}>
                      {podeEditar && (
                        <button className="btn-icon" type="button" onClick={() => iniciarEdicaoAcomp(a)} title="Editar">
                          ✏️
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          className="btn-icon btn-danger"
                          type="button"
                          onClick={() => excluirAcompanhante(a.id)}
                          disabled={acompExcluindo === a.id}
                          title="Excluir"
                        >
                          {acompExcluindo === a.id ? "..." : "🗑️"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {podeCriar && (
        <div className="card-base" style={{ marginTop: 12, border: "1px dashed #cbd5e1", background: "#f8fafc" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {acompEditId ? "Editar acompanhante" : "Adicionar acompanhante"}
          </div>
          {!mostrarFormAcomp && !acompEditId && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                resetAcompForm();
                setMostrarFormAcomp(true);
              }}
            >
              Adicionar acompanhante
            </button>
          )}
          {(mostrarFormAcomp || acompEditId) && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome completo</label>
                  <input
                    className="form-input"
                    value={acompForm.nome_completo}
                    onChange={(e) => setAcompForm((prev) => ({ ...prev, nome_completo: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input
                    className="form-input"
                    value={acompForm.cpf}
                    onChange={(e) => setAcompForm((prev) => ({ ...prev, cpf: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    className="form-input"
                    value={acompForm.telefone}
                    onChange={(e) => setAcompForm((prev) => ({ ...prev, telefone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Parentesco</label>
                  <input
                    className="form-input"
                    value={acompForm.grau_parentesco}
                    onChange={(e) => setAcompForm((prev) => ({ ...prev, grau_parentesco: e.target.value }))}
                    placeholder="Ex: Esposa, Filho"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">RG</label>
                  <input
                    className="form-input"
                    value={acompForm.rg}
                    onChange={(e) => setAcompForm((prev) => ({ ...prev, rg: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data nascimento</label>
                  <input
                    type="date"
                    className="form-input"
                    value={acompForm.data_nascimento}
                    onChange={(e) => setAcompForm((prev) => ({ ...prev, data_nascimento: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <input
                    className="form-input"
                    value={acompForm.observacoes}
                    onChange={(e) => setAcompForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ alignSelf: "flex-end" }}>
                  <label className="form-label">Ativo</label>
                  <input
                    type="checkbox"
                    checked={acompForm.ativo}
                    onChange={(e) => setAcompForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" type="button" onClick={salvarAcompanhante} disabled={acompSalvando}>
                  {acompSalvando ? "Salvando..." : acompEditId ? "Salvar alterações" : "Salvar"}
                </button>
                <button
                  className="btn btn-light"
                  type="button"
                  onClick={() => resetAcompForm(true)}
                  disabled={acompSalvando}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  // =====================================
  // UI
  // =====================================
  return (
    <>
    <div className="clientes-page">

      {/* FORMULÁRIO */}
      {!modoSomenteLeitura && mostrarFormCliente && (
        <div className="card-base card-blue mb-3">
          <h3>{editId ? "Editar cliente" : "Novo cliente"}</h3>
          {editId && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn ${abaFormCliente === "dados" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setAbaFormCliente("dados")}
              >
                Dados do cliente
              </button>
              <button
                type="button"
                className={`btn ${abaFormCliente === "acompanhantes" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setAbaFormCliente("acompanhantes")}
              >
                Acompanhantes
              </button>
            </div>
          )}
          {(!editId || abaFormCliente === "dados") && (
          <form onSubmit={salvar}>

            <div
              className="form-row"
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) repeat(5, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label className="form-label">Nome completo *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">CPF *</label>
                <input
                  className="form-input"
                  value={form.cpf}
                  onChange={(e) => handleChange("cpf", formatCpf(e.target.value))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">RG</label>
                <input
                  className="form-input"
                  value={form.rg}
                  onChange={(e) => handleChange("rg", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nascimento</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.nascimento}
                  onChange={(e) => handleChange("nascimento", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gênero</label>
                <select
                  className="form-select"
                  value={form.genero}
                  onChange={(e) => handleChange("genero", e.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nacionalidade</label>
                <input
                  className="form-input"
                  value={form.nacionalidade}
                  onChange={(e) => handleChange("nacionalidade", e.target.value)}
                />
              </div>
            </div>

            <div
              className="form-row"
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label className="form-label">Telefone *</label>
                <input
                  className="form-input"
                  value={form.telefone}
                  onChange={(e) => handleChange("telefone", formatTelefone(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Whatsapp</label>
                <input
                  className="form-input"
                  value={form.whatsapp}
                  onChange={(e) => handleChange("whatsapp", formatTelefone(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  className="form-input"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Classificação</label>
                <select
                  className="form-select"
                  value={form.classificacao}
                  onChange={(e) => handleChange("classificacao", e.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="A" title="Cliente frequente">A</option>
                  <option value="B" title="Compra mas não é frequente">B</option>
                  <option value="C" title="Já comprou, mas não é fiel">C</option>
                  <option value="D" title="Busca preço e a maioria das vezes compra na Internet">D</option>
                  <option value="E" title="Cliente de internet, nunca compra">E</option>
                </select>
              </div>
            </div>

            <div
              className="form-row"
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 0.75fr) minmax(0, 1.7fr) minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 0.9fr)",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label className="form-label">CEP</label>
                <input
                  className="form-input"
                  value={form.cep}
                  onChange={(e) => handleChange("cep", formatCep(e.target.value))}
                  onBlur={(e) => {
                    const val = formatCep(e.target.value);
                    handleChange("cep", val);
                    if (val.replace(/\D/g, "").length === 8) {
                      buscarCepIfNeeded(val);
                    } else {
                      setCepStatus(null);
                    }
                  }}
                />
                <small style={{ color: cepStatus?.includes("Não foi") ? "#b91c1c" : "#475569" }}>
                  {cepStatus || "Preencha para auto-preencher endereço."}
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input
                  className="form-input"
                  value={form.endereco}
                  onChange={(e) => handleChange("endereco", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Número</label>
                <input
                  className="form-input"
                  value={form.numero}
                  onChange={(e) => handleChange("numero", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Complemento</label>
                <input
                  className="form-input"
                  value={form.complemento}
                  onChange={(e) => handleChange("complemento", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input
                  className="form-input"
                  value={form.cidade}
                  onChange={(e) => handleChange("cidade", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <input
                  className="form-input"
                  value={form.estado}
                  onChange={(e) => handleChange("estado", e.target.value)}
                />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Notas</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={form.notas}
                  onChange={(e) => handleChange("notas", e.target.value)}
                  placeholder="Informações adicionais"
                />
              </div>
            </div>

            <div className="mt-2" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={salvando}
                type="submit"
              >
                    {salvando ? "Salvando..." : editId ? "Salvar alterações" : "Salvar"}
                  </button>

                  <button
                type="button"
                className="btn btn-light"
                onClick={fecharFormularioCliente}
                disabled={salvando}
              >
                Cancelar
              </button>
            </div>
          </form>
          )}
          {editId && abaFormCliente === "acompanhantes" && (
            <div style={{ marginTop: 12 }}>
              {acompanhantesCard}
            </div>
          )}
        </div>
      )}

      {msg && (
        <div className="card-base card-green mb-3">
          <strong>{msg}</strong>
        </div>
      )}

      {/* BUSCA */}
      <div className="card-base mb-3">
        <div
          className="form-row"
          style={{
            marginTop: 12,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div className="form-group" style={{ flex: "1 1 300px" }}>
            <label className="form-label">Buscar cliente</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, CPF ou e-mail"
            />
          </div>
          {podeCriar && (
            <div className="form-group" style={{ alignItems: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setForm(initialForm);
                  setEditId(null);
                  setAcompanhantes([]);
                  setAcompErro(null);
                  resetAcompForm(true);
                  setAbaFormCliente("dados");
                  setMsg(null);
                  setMostrarFormCliente(true);
                }}
                disabled={mostrarFormCliente}
              >
                Adicionar cliente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      {/* LISTA */}
      <div
        className="table-container overflow-x-auto"
        style={{ maxHeight: "65vh", overflowY: "auto" }}
      >
        <table className="table-default table-header-blue clientes-table min-w-[820px]">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>E-mail</th>
                {exibeColunaAcoes && (
                  <th className="th-actions" style={{ textAlign: "center" }}>
                    Ações
                  </th>
                )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>Carregando...</td>
              </tr>
            )}

            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum cliente encontrado.</td>
              </tr>
            )}

            {!loading &&
              filtrados.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td>{c.cpf}</td>
                    <td>{c.telefone}</td>
                    <td>{c.email || "-"}</td>

                  {exibeColunaAcoes && (
                    <td
                      className="th-actions"
                      style={{
                        textAlign: "center",
                        display: "flex",
                        gap: 6,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {(() => {
                        const whatsappLink = construirLinkWhatsApp(c.whatsapp);
                        if (!whatsappLink) return null;
                        return (
                          <a
                            className="btn-icon"
                            href={whatsappLink}
                            title="Abrir WhatsApp"
                            target="_blank"
                            rel="noreferrer"
                          >
                            💬
                          </a>
                        );
                      })()}
                      <button
                        className="btn-icon"
                        onClick={() => abrirHistorico(c)}
                        title="Histórico"
                      >
                        🗂️
                      </button>
                      {podeEditar && (
                        <button
                          className="btn-icon"
                          onClick={() => iniciarEdicao(c)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                      )}

                      {podeExcluir && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => excluir(c.id)}
                          disabled={excluindoId === c.id}
                          title="Excluir"
                        >
                          {excluindoId === c.id ? "..." : "🗑️"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
    {historicoCliente && (
      <div className="modal-backdrop">
        <div className="modal-panel" style={{ maxWidth: 1100, width: "95vw" }}>
          <div className="modal-header">
            <div>
              <div
                className="modal-title"
                style={{ color: "#1d4ed8", fontSize: "1.2rem", fontWeight: 800 }}
              >
                Histórico de {historicoCliente.nome}
              </div>
              <small style={{ color: "#64748b" }}>Vendas e orçamentos do cliente</small>
            </div>
            <button className="btn-ghost" onClick={fecharHistorico}>✕</button>
          </div>

          <div className="modal-body">
            {loadingHistorico && <p>Carregando histórico...</p>}

            {!loadingHistorico && (
              <>
                {acompanhantesCard}

                <div className="card-base mb-2">
                  <h4 style={{ marginBottom: 8 }}>Vendas</h4>
                  <div className="table-container overflow-x-auto">
                    <table className="table-default table-header-blue min-w-[820px]">
                      <thead>
                        <tr>
                          <th>Data Lançamento</th>
                          <th>Destino</th>
                          <th>Embarque</th>
                          <th>Valor</th>
                          <th>Taxas</th>
                          <th className="th-actions" style={{ textAlign: "center" }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoVendas.length === 0 && (
                          <tr>
                            <td colSpan={6}>Nenhuma venda encontrada.</td>
                          </tr>
                        )}
                        {historicoVendas.map((v) => (
                          <tr key={v.id}>
                            <td>
                              {v.data_lancamento
                                ? new Date(v.data_lancamento).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td>{v.destino_cidade_nome || "-"}</td>
                            <td>
                              {v.data_embarque
                                ? new Date(v.data_embarque).toLocaleDateString("pt-BR")
                                : "-"}
                            </td>
                            <td>
                              {v.valor_total.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td>
                              {v.valor_taxas.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td className="th-actions" style={{ textAlign: "center" }}>
                              <button
                                className="btn-icon"
                                type="button"
                                onClick={() => verDetalheVenda(v)}
                                title="Ver detalhes"
                              >
                                👁️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card-base card-blue mb-2">
                  <h4 style={{ marginBottom: 8 }}>Orçamentos do cliente</h4>
                  <div className="table-container overflow-x-auto">
                    <table className="table-default table-header-blue min-w-[760px]">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Status</th>
                          <th>Destino</th>
                          <th>Produto</th>
                          <th>Valor</th>
                          <th>Venda</th>
                          <th className="th-actions" style={{ textAlign: "center" }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoOrcamentos.length === 0 && (
                          <tr>
                            <td colSpan={7}>Nenhum orçamento encontrado.</td>
                          </tr>
                        )}
                        {historicoOrcamentos.map((o) => (
                          <tr key={o.id}>
                            <td>
                              {o.data_orcamento
                                ? new Date(o.data_orcamento).toLocaleDateString("pt-BR").replaceAll("/", "-")
                                : "-"}
                            </td>
                            <td style={{ textTransform: "capitalize" }}>{o.status || "-"}</td>
                            <td>{o.destino_cidade_nome || "-"}</td>
                            <td>{o.produto_nome || "-"}</td>
                            <td>
                              {(o.valor ?? 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td>{o.numero_venda || "-"}</td>
                            <td className="th-actions" style={{ textAlign: "center" }}>
                              <button
                                className="btn-icon"
                                type="button"
                                onClick={() => verDetalheOrcamento(o)}
                                title="Ver detalhes"
                              >
                                👁️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={fecharHistorico}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Detalhe da venda */}
    {detalheVenda && (
      <div className="modal-backdrop">
        <div className="modal-panel" style={{ maxWidth: 720 }}>
          <div className="modal-header">
            <div>
              <div
                className="modal-title"
                style={{ color: "#16a34a", fontSize: "1.15rem", fontWeight: 800 }}
              >
                Detalhes da venda
              </div>
            </div>
            <button className="btn-ghost" onClick={() => { setDetalheVenda(null); setDetalheRecibos([]); }}>
              ✕
            </button>
          </div>
          <div className="modal-body">
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  lineHeight: 1.4,
                marginBottom: 8,
              }}
              >
                <div>
                  <strong>Recibo:</strong>{" "}
                  {detalheRecibos.length > 0
                    ? detalheRecibos.map((r) => r.numero_recibo || "-").join(", ")
                    : "—"}
                </div>
                <div>
                  <strong>Destino:</strong> {detalheVenda.destino_cidade_nome || "-"}
                </div>
                <div>
                  <strong>Lançamento:</strong>{" "}
                  {new Date(detalheVenda.data_lancamento).toLocaleDateString("pt-BR")}
                </div>
              <div>
                <strong>Embarque:</strong>{" "}
                {detalheVenda.data_embarque
                  ? new Date(detalheVenda.data_embarque).toLocaleDateString("pt-BR")
                  : "-"}
              </div>
              <div>
                <strong>Valor:</strong>{" "}
                {detalheVenda.valor_total.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              <div>
                <strong>Taxas:</strong>{" "}
                {detalheVenda.valor_taxas === 0
                  ? "-"
                  : detalheVenda.valor_taxas.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
              </div>
            </div>

            <h4 style={{ marginBottom: 8, textAlign: "center" }}>Recibos</h4>
            {carregandoRecibos ? (
              <p>Carregando recibos...</p>
            ) : (
              <div className="table-container overflow-x-auto">
                <table className="table-default table-header-blue" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Produto</th>
                      <th style={{ textAlign: "center" }}>Início</th>
                      <th style={{ textAlign: "center" }}>Fim</th>
                      <th>Valor</th>
                      <th>Taxas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalheRecibos.length === 0 && (
                      <tr>
                        <td colSpan={4}>Nenhum recibo encontrado.</td>
                      </tr>
                    )}
                    {detalheRecibos.map((r, idx) => {
                      const formatarData = (value: string | null | undefined) =>
                        value
                          ? new Date(value).toLocaleDateString("pt-BR")
                          : "-";
                      return (
                        <tr key={idx}>
                          <td>{r.numero_recibo || "-"}</td>
                          <td>{r.produto_nome || "-"}</td>
                          <td style={{ textAlign: "center" }}>{formatarData(r.data_inicio)}</td>
                          <td style={{ textAlign: "center" }}>{formatarData(r.data_fim)}</td>
                          <td>
                            {(r.valor_total || 0).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>
                          <td>
                            {(r.valor_taxas || 0).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-outline"
              onClick={() => { setDetalheVenda(null); setDetalheRecibos([]); }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Detalhe do orçamento */}
    {detalheOrcamento && (
      <div className="modal-backdrop">
        <div className="modal-panel" style={{ maxWidth: 640 }}>
          <div className="modal-header">
            <div>
              <div
                className="modal-title"
                style={{ color: "#1d4ed8", fontSize: "1.15rem", fontWeight: 800 }}
              >
                Detalhes do orçamento
              </div>
              <small style={{ color: "#64748b" }}>
                Destino: {detalheOrcamento.destino_nome || "-"}
              </small>
            </div>
            <button className="btn-ghost" onClick={() => setDetalheOrcamento(null)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div
              style={{
                display: "grid",
                gap: 6,
                lineHeight: 1.4,
                marginBottom: 4,
              }}
            >
              <div>
                <strong>Data:</strong>{" "}
                {detalheOrcamento.data_orcamento
                  ? new Date(detalheOrcamento.data_orcamento).toLocaleDateString("pt-BR")
                  : "-"}
              </div>
              <div>
                <strong>Status:</strong> {detalheOrcamento.status || "-"}
              </div>
              <div>
                <strong>Valor:</strong>{" "}
                {(detalheOrcamento.valor || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              <div>
                <strong>Venda vinculada:</strong> {detalheOrcamento.numero_venda || "-"}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setDetalheOrcamento(null)}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
