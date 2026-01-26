import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { titleCaseWithExceptions } from "../../lib/titleCase";

type ClienteOption = {
  id: string;
  nome: string;
  cpf?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

type TipoProdutoOption = { id: string; label: string };

type CidadeOption = {
  id: string;
  nome: string;
  subdivisao_nome?: string | null;
  pais_nome?: string | null;
};

type ProdutoOption = {
  nome: string | null;
  destino?: string | null;
  cidade_id?: string | null;
};

type ManualItem = {
  temp_id: string;
  item_type: string;
  title: string;
  product_name: string;
  city_name: string;
  cidade_id: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  taxes_amount: number;
  start_date: string;
  end_date: string;
  currency: string;
  raw: Record<string, unknown>;
  order_index: number;
};

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeCpf(value: string) {
  return (value || "").replace(/\D/g, "");
}

function normalizeLookupText(value: string) {
  return normalizeText(value || "").trim();
}

function normalizeCityName(value: string) {
  return normalizeLookupText(value);
}

function formatCidadeLabel(cidade: CidadeOption) {
  const nome = (cidade.nome || "").trim();
  const subdivisao = (cidade.subdivisao_nome || "").trim();
  const pais = (cidade.pais_nome || "").trim();
  let detalhe = "";
  if (subdivisao && normalizeCityName(subdivisao) !== normalizeCityName(nome)) {
    detalhe = subdivisao;
  } else if (pais) {
    detalhe = pais;
  } else if (subdivisao) {
    detalhe = subdivisao;
  }
  return detalhe ? `${nome} (${detalhe})` : nome;
}

function normalizeNumber(value: string) {
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hojeISO() {
  return new Date().toISOString().substring(0, 10);
}

function dedupeSugestoes(valores: string[]) {
  const vistos = new Set<string>();
  const lista: string[] = [];
  valores.forEach((valor) => {
    const nome = (valor || "").trim();
    if (!nome) return;
    const chave = normalizeText(nome);
    if (vistos.has(chave)) return;
    vistos.add(chave);
    lista.push(nome);
  });
  return lista;
}

function gerarIdTemporario() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const TIPO_DATALIST_ID = "quote-manual-tipos-list";
const DESTINO_DATALIST_ID = "quote-manual-destinos-list";

const EXCLUDED_PRODUTO_TIPOS = new Set(
  [
    "Seguro viagem",
    "Passagem Aerea",
    "Passagem Facial",
    "Aereo",
    "Chip",
    "Aluguel de Carro",
  ].map((value) => normalizeLookupText(value))
);

function criarItemManual(): ManualItem {
  return {
    temp_id: gerarIdTemporario(),
    item_type: "",
    title: "",
    product_name: "",
    city_name: "",
    cidade_id: null,
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    taxes_amount: 0,
    start_date: "",
    end_date: "",
    currency: "BRL",
    raw: {},
    order_index: 0,
  };
}

function isItemEmpty(item: ManualItem) {
  const hasValue =
    item.item_type.trim() ||
    item.title.trim() ||
    item.product_name.trim() ||
    item.city_name.trim() ||
    item.cidade_id ||
    item.start_date ||
    item.end_date ||
    item.total_amount > 0 ||
    item.taxes_amount > 0 ||
    item.quantity !== 1;
  return !hasValue;
}

function validateItem(item: ManualItem) {
  return Boolean(
    item.item_type &&
      item.quantity > 0 &&
      item.start_date &&
      (item.title || item.product_name) &&
      item.total_amount > 0
  );
}

function isSeguroItem(item: ManualItem) {
  const normalized = normalizeLookupText(item.item_type || "");
  return normalized.includes("seguro") && normalized.includes("viagem");
}

function normalizeTitleText(value: string) {
  return titleCaseWithExceptions(value || "");
}

function normalizeItemText(item: ManualItem): ManualItem {
  if (isSeguroItem(item)) {
    return {
      ...item,
      title: "SEGURO VIAGEM",
      product_name: "SEGURO VIAGEM",
      city_name: item.city_name ? normalizeTitleText(item.city_name) : item.city_name,
    };
  }
  return {
    ...item,
    title: item.title ? normalizeTitleText(item.title) : item.title,
    product_name: item.product_name ? normalizeTitleText(item.product_name) : item.product_name,
    city_name: item.city_name ? normalizeTitleText(item.city_name) : item.city_name,
  };
}

export default function QuoteManualIsland() {
  const [items, setItems] = useState<ManualItem[]>(() => [criarItemManual()]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clientesErro, setClientesErro] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteTelefone, setNovoClienteTelefone] = useState("");
  const [novoClienteErro, setNovoClienteErro] = useState<string | null>(null);
  const [novoClienteSalvando, setNovoClienteSalvando] = useState(false);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [tipoOptions, setTipoOptions] = useState<TipoProdutoOption[]>([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState<ProdutoOption[]>([]);
  const [destinoOptions, setDestinoOptions] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [cidadeSuggestions, setCidadeSuggestions] = useState<Record<string, CidadeOption[]>>({});
  const [cidadeInputValues, setCidadeInputValues] = useState<Record<string, string>>({});
  const [cidadeCache, setCidadeCache] = useState<Record<string, string>>({});
  const [cidadeNameMap, setCidadeNameMap] = useState<Record<string, string>>({});
  const cidadeFetchTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      Object.values(cidadeFetchTimeouts.current).forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function carregarTipos() {
      try {
        const { data, error } = await supabaseBrowser
          .from("tipo_produtos")
          .select("id, nome, tipo")
          .order("nome", { ascending: true })
          .limit(500);
        if (!active) return;
        if (error) {
          console.warn("[QuoteManual] Falha ao carregar tipos", error);
          return;
        }
        setTipoOptions(
          (data || [])
            .filter((tipo) => tipo && (tipo.nome || tipo.tipo))
            .map((tipo) => {
              const label = tipo.nome?.trim() || tipo.tipo?.trim() || "";
              return { id: tipo.id, label };
            })
            .filter((tipo) => tipo.label)
        );
      } catch (err) {
        if (!active) return;
        console.warn("[QuoteManual] Erro ao carregar tipos", err);
      }
    }
    carregarTipos();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function carregarClientes() {
      setCarregandoClientes(true);
      try {
        const { data, error } = await supabaseBrowser
          .from("clientes")
          .select("id, nome, cpf, whatsapp, email")
          .order("nome", { ascending: true })
          .limit(1000);
        if (error) throw error;
        if (!active) return;
        setClientes((data || []) as ClienteOption[]);
        setClientesErro(null);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        if (!active) return;
        setClientesErro("Nao foi possivel carregar os clientes.");
      } finally {
        if (active) setCarregandoClientes(false);
      }
    }
    carregarClientes();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function resolverCompanyId() {
      try {
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user = sessionUser || (await supabaseBrowser.auth.getUser()).data?.user || null;
        if (!user || !active) return;
        const { data, error } = await supabaseBrowser
          .from("users")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.error("Erro ao buscar company_id do usuario:", error);
          return;
        }
        setCompanyId(data?.company_id || null);
      } catch (err) {
        if (!active) return;
        console.error("Erro ao resolver company_id:", err);
      }
    }
    resolverCompanyId();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function carregarProdutosEDestinos() {
      try {
        const produtosResp = await supabaseBrowser
          .from("produtos")
          .select("nome, destino")
          .order("nome", { ascending: true })
          .limit(1000);
        if (!active) return;
        if (produtosResp.error) {
          console.warn("[QuoteManual] Falha ao carregar produtos", produtosResp.error);
        }

        setProdutosCatalogo((produtosResp.data || []) as ProdutoOption[]);

        const destinos: string[] = [];
        (produtosResp.data || []).forEach((produto) => {
          const nome = (produto?.destino || "").trim();
          if (nome) destinos.push(nome);
        });
        setDestinoOptions(dedupeSugestoes(destinos));
      } catch (err) {
        if (!active) return;
        console.warn("[QuoteManual] Erro ao carregar produtos/destinos", err);
      }
    }
    carregarProdutosEDestinos();
    return () => {
      active = false;
    };
  }, []);

  async function loadCidadeSuggestions(rowKey: string, term: string) {
    const search = term.trim();
    const limit = 25;
    let cidades: CidadeOption[] = [];
    try {
      const { data, error } = await supabaseBrowser.rpc("buscar_cidades", { q: search, limite: limit });
      if (!error && Array.isArray(data)) {
        cidades = (data as CidadeOption[]).filter((cidade) => cidade?.id && cidade.nome);
      } else if (error) {
        console.warn("[QuoteManual] RPC buscar_cidades falhou, tentando fallback.", error);
      }
    } catch (err) {
      console.warn("[QuoteManual] Erro ao buscar cidades (RPC)", err);
    }

    if (!cidades.length) {
      const pattern = search ? `%${search}%` : "%";
      try {
        const { data, error } = await supabaseBrowser
          .from("cidades")
          .select("id, nome, subdivisao_nome, pais_nome")
          .ilike("nome", pattern)
          .order("nome", { ascending: true })
          .limit(limit);
        if (!isMountedRef.current) return;
        if (error) {
          console.warn("[QuoteManual] Falha ao buscar cidades", error);
          setCidadeSuggestions((prev) => ({ ...prev, [rowKey]: [] }));
          return;
        }
        cidades = (data || []).filter((cidade) => cidade?.id && cidade.nome);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.warn("[QuoteManual] Erro ao buscar cidades", err);
        setCidadeSuggestions((prev) => ({ ...prev, [rowKey]: [] }));
        return;
      }
    }

    if (!isMountedRef.current) return;
    setCidadeSuggestions((prev) => ({ ...prev, [rowKey]: cidades }));
    if (cidades.length) {
      setCidadeCache((prev) => {
        const next = { ...prev };
        cidades.forEach((cidade) => {
          if (cidade.id && cidade.nome) {
            next[cidade.id] = formatCidadeLabel(cidade);
          }
        });
        return next;
      });
      setCidadeNameMap((prev) => {
        const next = { ...prev };
        cidades.forEach((cidade) => {
          if (cidade.id && cidade.nome) {
            const nomeKey = normalizeCityName(cidade.nome);
            const labelKey = normalizeCityName(formatCidadeLabel(cidade));
            if (nomeKey && !next[nomeKey]) next[nomeKey] = cidade.id;
            if (labelKey && !next[labelKey]) next[labelKey] = cidade.id;
          }
        });
        return next;
      });
    }
  }

  function scheduleCidadeFetch(rowKey: string, term: string) {
    const existing = cidadeFetchTimeouts.current[rowKey];
    if (existing) {
      clearTimeout(existing);
    }
    cidadeFetchTimeouts.current[rowKey] = setTimeout(() => loadCidadeSuggestions(rowKey, term), 250);
  }

  function getCidadeInputValue(item: ManualItem, rowKey: string) {
    if (Object.prototype.hasOwnProperty.call(cidadeInputValues, rowKey)) {
      return cidadeInputValues[rowKey] || "";
    }
    if (item.cidade_id) {
      return cidadeCache[item.cidade_id] || "";
    }
    return "";
  }

  function handleCidadeInputChange(index: number, value: string, rowKey: string) {
    const normalized = normalizeCityName(value);
    const matchedId = cidadeNameMap[normalized];
    const matchedCidade = cidadeSuggestions[rowKey]?.find((cidade) => {
      const label = formatCidadeLabel(cidade);
      return (
        normalizeCityName(label) === normalized ||
        normalizeCityName(cidade.nome) === normalized
      );
    });
    const displayValue =
      (matchedCidade ? formatCidadeLabel(matchedCidade) : "") ||
      (matchedId ? cidadeCache[matchedId] : "") ||
      value;
    setCidadeInputValues((prev) => ({
      ...prev,
      [rowKey]: displayValue,
    }));
    updateItem(index, { cidade_id: matchedId ?? matchedCidade?.id ?? null });
    if (value.trim().length >= 1) {
      scheduleCidadeFetch(rowKey, value);
    }
  }

  const clientesFiltrados = useMemo(() => {
    if (!clienteBusca.trim()) return clientes;
    const termo = normalizeText(clienteBusca);
    const cpfTermo = normalizeCpf(clienteBusca);
    return clientes.filter((c) => {
      if (normalizeText(c.nome).includes(termo)) return true;
      if (cpfTermo && normalizeCpf(c.cpf || "").includes(cpfTermo)) return true;
      return false;
    });
  }, [clientes, clienteBusca]);

  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === clienteId) || null,
    [clientes, clienteId]
  );

  function handleClienteInputChange(value: string) {
    setClienteBusca(value);
    const texto = normalizeText(value);
    const cpfTexto = normalizeCpf(value);
    const achado = clientes.find((c) => {
      const cpf = normalizeCpf(c.cpf || "");
      return normalizeText(c.nome) === texto || (cpfTexto && cpf === cpfTexto);
    });
    setClienteId(achado?.id || "");
  }

  function handleClienteBlur() {
    if (!clienteBusca.trim()) return;
    const texto = normalizeText(clienteBusca);
    const cpfTexto = normalizeCpf(clienteBusca);
    const achado = clientesFiltrados.find((c) => {
      const cpf = normalizeCpf(c.cpf || "");
      return normalizeText(c.nome) === texto || (cpfTexto && cpf === cpfTexto);
    });
    if (achado) {
      setClienteId(achado.id);
      setClienteBusca("");
    }
  }

  function abrirNovoCliente() {
    const nomeBase = clienteBusca.trim();
    setNovoClienteNome(nomeBase);
    setNovoClienteTelefone("");
    setNovoClienteErro(null);
    setNovoClienteAberto(true);
  }

  function cancelarNovoCliente() {
    setNovoClienteAberto(false);
    setNovoClienteNome("");
    setNovoClienteTelefone("");
    setNovoClienteErro(null);
  }

  async function salvarNovoCliente() {
    const nomeRaw = novoClienteNome.trim();
    const telefoneRaw = novoClienteTelefone.trim();
    if (!nomeRaw || !telefoneRaw) {
      setNovoClienteErro("Informe nome e telefone.");
      return;
    }
    setNovoClienteSalvando(true);
    setNovoClienteErro(null);
    try {
      const payload: Record<string, any> = {
        nome: titleCaseWithExceptions(nomeRaw),
        telefone: telefoneRaw,
        whatsapp: telefoneRaw,
        ativo: true,
        active: true,
      };
      if (companyId) {
        payload.company_id = companyId;
      }
      const { data, error } = await supabaseBrowser
        .from("clientes")
        .insert(payload)
        .select("id, nome, cpf, whatsapp, email")
        .single();
      if (error || !data) {
        throw error || new Error("Nao foi possivel criar o cliente.");
      }
      setClientes((prev) => {
        const next = [...prev, data as ClienteOption];
        next.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        return next;
      });
      setClienteId(data.id);
      setClienteBusca("");
      setNovoClienteAberto(false);
      setNovoClienteNome("");
      setNovoClienteTelefone("");
    } catch (err) {
      console.error(err);
      setNovoClienteErro("Nao foi possivel criar o cliente.");
    } finally {
      setNovoClienteSalvando(false);
    }
  }

  function buildProdutoSuggestions(item: ManualItem) {
    const destinoTerm = normalizeLookupText(item.city_name || "");
    const cidadeId = item.cidade_id || null;

    const matchesByCidade = cidadeId
      ? produtosCatalogo.filter((produto) => produto?.cidade_id === cidadeId)
      : [];

    const matchesByDestino = destinoTerm
      ? produtosCatalogo.filter((produto) => {
          const destinoProduto = normalizeLookupText(produto?.destino || "");
          return destinoProduto.includes(destinoTerm);
        })
      : [];

    let base = matchesByCidade;
    if (!base.length && matchesByDestino.length) {
      base = matchesByDestino;
    }
    if (!base.length && !cidadeId && destinoTerm) {
      base = matchesByDestino;
    }
    if (!base.length) {
      return [];
    }

    return dedupeSugestoes(
      base
        .map((produto) => (produto?.nome || "").trim())
        .filter(Boolean)
    ).slice(0, 50);
  }

  const tipoLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    tipoOptions.forEach((option) => {
      const key = normalizeLookupText(option.label);
      if (key) map.set(key, option.id);
    });
    return map;
  }, [tipoOptions]);
  const dataMinimaInicio = useMemo(() => hojeISO(), []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [items]
  );
  const taxesTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0),
    [items]
  );
  const total = useMemo(() => subtotal + taxesTotal, [subtotal, taxesTotal]);

  function updateItem(index: number, updates: Partial<ManualItem>) {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const updated = { ...current, ...updates };
      const quantity = Math.max(1, Math.round(Number(updated.quantity) || 1));
      const totalAmount = Number(updated.total_amount) || 0;
      const unitPrice = quantity > 0 ? totalAmount / quantity : totalAmount;
      updated.quantity = quantity;
      updated.total_amount = totalAmount;
      updated.taxes_amount = Number(updated.taxes_amount) || 0;
      updated.unit_price = unitPrice;
      next[index] = updated;
      return next;
    });
  }

  function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    setItems(next);
  }

  function removerItem(index: number) {
    const current = items[index];
    if (!current) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Confirma a exclusão deste item?");
      if (!confirmed) return;
    }
    const rowKey = current.temp_id || `row-${index}`;
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [criarItemManual()];
    });
    setCidadeInputValues((prev) => {
      if (!prev[rowKey]) return prev;
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setCidadeSuggestions((prev) => {
      if (!prev[rowKey]) return prev;
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  }

  function adicionarItem() {
    setItems((prev) => [...prev, criarItemManual()]);
  }

  function limparItens() {
    setItems([criarItemManual()]);
    setCidadeInputValues({});
    setCidadeSuggestions({});
    setCidadeCache({});
    setCidadeNameMap({});
    setError(null);
    setStatus(null);
  }

  function handleCancel() {
    if (typeof window !== "undefined") {
      window.location.href = "/orcamentos/consulta";
    }
  }

  async function syncProductsCatalog(itemsToSync: ManualItem[]) {
    if (!itemsToSync.length) return;
    for (const item of itemsToSync) {
      const nomeRaw = (item.title || item.product_name || "").trim();
      if (!nomeRaw) continue;
      const nome = titleCaseWithExceptions(nomeRaw);
      if (!nome) continue;
      const destinoRaw = (item.city_name || "").trim();
      const destino = destinoRaw ? titleCaseWithExceptions(destinoRaw) : null;
      const cidadeId = item.cidade_id || null;
      const tipoKey = normalizeLookupText(item.item_type || "");
      if (EXCLUDED_PRODUTO_TIPOS.has(tipoKey)) {
        continue;
      }
      const tipoId = tipoLabelMap.get(tipoKey) || null;
      const payload = {
        nome,
        destino,
        cidade_id: cidadeId,
        tipo_produto: tipoId,
      };

      try {
        let query = supabaseBrowser.from("produtos").select("id");
        query = query.eq("nome", payload.nome);
        if (payload.destino) {
          query = query.eq("destino", payload.destino);
        } else {
          query = query.is("destino", null);
        }
        if (payload.cidade_id) {
          query = query.eq("cidade_id", payload.cidade_id);
        } else {
          query = query.is("cidade_id", null);
        }
        const { data: existing, error: selectErr } = await query.maybeSingle();
        if (selectErr) {
          console.warn("[QuoteManual] Falha ao buscar produto", selectErr);
          continue;
        }
        if (existing?.id) {
          const { error: updateErr } = await supabaseBrowser
            .from("produtos")
            .update(payload)
            .eq("id", existing.id);
          if (updateErr) {
            console.warn("[QuoteManual] Falha ao atualizar produto", updateErr);
          }
        } else {
          const { error: insertErr } = await supabaseBrowser.from("produtos").insert(payload);
          if (insertErr) {
            console.warn("[QuoteManual] Falha ao inserir produto", insertErr);
          }
        }
      } catch (err) {
        console.warn("[QuoteManual] Erro ao sincronizar produto", err);
      }
    }
  }

  async function handleSave() {
    if (!clienteId) {
      setError("Selecione um cliente antes de salvar.");
      return;
    }

    const itensComDados = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !isItemEmpty(item));

    if (!itensComDados.length) {
      setError("Adicione ao menos um produto para salvar.");
      return;
    }

    const invalidIndexes: number[] = [];
    const invalidPastDates: number[] = [];
    const itensPreparados: ManualItem[] = [];

    itensComDados.forEach(({ item, index }) => {
      const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
      const totalAmount = Number(item.total_amount) || 0;
      const unitPrice = quantity > 0 ? totalAmount / quantity : totalAmount;
      const normalized = normalizeItemText({
        ...item,
        quantity,
        total_amount: totalAmount,
        taxes_amount: Number(item.taxes_amount) || 0,
        unit_price: unitPrice,
        order_index: index,
      });
      if (normalized.start_date && dataMinimaInicio && normalized.start_date < dataMinimaInicio) {
        invalidPastDates.push(index + 1);
        return;
      }
      if (!validateItem(normalized)) {
        invalidIndexes.push(index + 1);
        return;
      }
      itensPreparados.push(normalized);
    });

    if (invalidPastDates.length > 0) {
      setError(
        `Itens com Inicio anterior a hoje: ${invalidPastDates.join(", ")}.`
      );
      return;
    }

    if (invalidIndexes.length > 0) {
      setError(
        `Preencha Tipo, Produto, Inicio, Qtd e Total nos itens: ${invalidIndexes.join(", ")}.`
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessId(null);
    setStatus("Salvando orcamento...");

    let quoteId: string | null = null;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabaseBrowser.auth.getUser();

      if (authError || !user) {
        throw new Error("Usuario nao autenticado.");
      }

      const clienteSelecionado = clientes.find((c) => c.id === clienteId) || null;
      const subtotalValue = itensPreparados.reduce(
        (sum, item) => sum + Number(item.total_amount || 0),
        0
      );
      const taxesValue = itensPreparados.reduce(
        (sum, item) => sum + Number(item.taxes_amount || 0),
        0
      );
      const shouldConfirm = itensPreparados.every(validateItem);
      const statusQuote = shouldConfirm ? "CONFIRMED" : "IMPORTED";

      const quotePayload = {
        created_by: user.id,
        client_id: clienteId,
        client_name: clienteSelecionado?.nome || clienteBusca.trim() || null,
        client_whatsapp: clienteSelecionado?.whatsapp || null,
        client_email: clienteSelecionado?.email || null,
        status: statusQuote,
        currency: "BRL",
        subtotal: subtotalValue,
        taxes: taxesValue,
        total: subtotalValue,
        average_confidence: 1,
        raw_json: { manual: true },
      };

      const { data: quote, error: quoteError } = await supabaseBrowser
        .from("quote")
        .insert(quotePayload)
        .select("id")
        .single();

      if (quoteError || !quote) {
        throw quoteError || new Error("Falha ao criar quote.");
      }

      quoteId = quote.id;

      const itemsPayload = itensPreparados.map((item, index) => ({
        quote_id: quote.id,
        item_type: item.item_type,
        title: item.title,
        product_name: item.product_name,
        city_name: item.city_name,
        cidade_id: item.cidade_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        taxes_amount: item.taxes_amount,
        start_date: item.start_date || null,
        end_date: item.end_date || item.start_date || null,
        currency: item.currency || "BRL",
        confidence: 1,
        order_index: typeof item.order_index === "number" ? item.order_index : index,
        raw: item.raw || {},
      }));

      const { error: itemError } = await supabaseBrowser.from("quote_item").insert(itemsPayload);
      if (itemError) throw itemError;

      await syncProductsCatalog(itensPreparados);

      setSuccessId(quote.id);
      setStatus(`Salvo como ${statusQuote}.`);
      if (typeof window !== "undefined") {
        window.location.href = "/orcamentos/consulta";
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar orcamento.");
      if (quoteId) {
        await supabaseBrowser
          .from("quote")
          .update({ status: "FAILED", updated_at: new Date().toISOString() })
          .eq("id", quoteId);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content-wrap orcamentos-criar-page">
      <div className="card-base" style={{ marginBottom: 16 }}>
        <h2 className="page-title">Criar orcamento</h2>
        <p className="page-subtitle">
          Preencha os itens manualmente e confirme para salvar o orcamento.
        </p>
        <div className="form-row quote-manual-client-row mobile-stack" style={{ marginTop: 12 }}>
          <div className="form-group" style={{ flex: 2, minWidth: 220 }}>
            <label className="form-label">Cliente *</label>
            <input
              className="form-input"
              list="listaClientes"
              placeholder="Buscar cliente..."
              value={clienteSelecionado?.nome || clienteBusca}
              onChange={(e) => handleClienteInputChange(e.target.value)}
              onBlur={handleClienteBlur}
              required
            />
            <datalist id="listaClientes">
              {clientesFiltrados.map((c) => (
                <React.Fragment key={c.id}>
                  <option value={c.nome} label={c.cpf ? `CPF: ${c.cpf}` : undefined} />
                  {c.cpf ? <option value={c.cpf} label={c.nome} /> : null}
                </React.Fragment>
              ))}
            </datalist>
            {carregandoClientes && (
              <small style={{ color: "#64748b" }}>Carregando clientes...</small>
            )}
            {clientesErro && <small style={{ color: "#b91c1c" }}>{clientesErro}</small>}
            <div style={{ marginTop: 8 }}>
              {!novoClienteAberto ? (
                <button type="button" className="btn btn-light w-full sm:w-auto" onClick={abrirNovoCliente}>
                  Novo cliente
                </button>
              ) : (
                <div className="card-base" style={{ padding: 12, marginTop: 8 }}>
                  <div className="form-row mobile-stack">
                    <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                      <label className="form-label">Nome do cliente *</label>
                      <input
                        className="form-input"
                        value={novoClienteNome}
                        onChange={(e) => setNovoClienteNome(e.target.value)}
                        onBlur={(e) => setNovoClienteNome(titleCaseWithExceptions(e.target.value))}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
                      <label className="form-label">Telefone *</label>
                      <input
                        className="form-input"
                        value={novoClienteTelefone}
                        onChange={(e) => setNovoClienteTelefone(e.target.value)}
                        placeholder="Telefone do cliente"
                      />
                    </div>
                  </div>
                  {novoClienteErro && <small style={{ color: "#b91c1c" }}>{novoClienteErro}</small>}
                  <div className="mobile-stack-buttons" style={{ justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn btn-light w-full sm:w-auto"
                      onClick={cancelarNovoCliente}
                      disabled={novoClienteSalvando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary w-full sm:w-auto"
                      onClick={salvarNovoCliente}
                      disabled={novoClienteSalvando}
                    >
                      {novoClienteSalvando ? "Salvando..." : "Salvar cliente"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {status && <div style={{ marginTop: 12, fontSize: 14 }}>{status}</div>}
        {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>{error}</div>}
      </div>

      <div className="mb-3">
        <div className="card-base mb-2" style={{ padding: "12px 16px" }}>
          <h3 style={{ margin: 0 }}>Itens do orcamento</h3>
          <div style={{ marginTop: 6, fontSize: 14 }}>
            Total estimado: R$ {formatCurrency(total)}
          </div>
        </div>
        <div
          className="table-container overflow-x-auto"
          style={{ maxHeight: "65vh", overflowY: "auto" }}
        >
          <table className="table-default table-compact table-mobile-cards quote-items-table">
            <thead>
              <tr>
                <th className="order-cell">Ordem</th>
                <th>Tipo</th>
                <th>Cidade</th>
                <th>Destino</th>
                <th>Produto</th>
                <th>Inicio</th>
                <th>Fim</th>
                <th>Qtd</th>
                <th>Total</th>
                <th>Taxas</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const rowKey = item.temp_id || `row-${index}`;
                const produtoOptions = buildProdutoSuggestions(item);
                return (
                  <React.Fragment key={rowKey}>
                    <tr>
                      <td className="order-cell" data-label="">
                        <div className="order-cell-head">
                          <span className="order-label">Ordem</span>
                          <div className="icon-action-group">
                            <button
                              type="button"
                              className="icon-action-btn"
                              title="Mover para cima"
                              onClick={() => moveItem(index, "up")}
                              disabled={index === 0}
                            >
                              ⬆️
                            </button>
                            <button
                              type="button"
                              className="icon-action-btn"
                              title="Mover para baixo"
                              onClick={() => moveItem(index, "down")}
                              disabled={index === items.length - 1}
                            >
                              ⬇️
                            </button>
                            <button
                              type="button"
                              className="icon-action-btn danger"
                              title="Remover item"
                              onClick={() => removerItem(index)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="order-value">#{index + 1}</div>
                      </td>
                      <td data-label="Tipo">
                        <input
                          className="form-input"
                          list={TIPO_DATALIST_ID}
                          value={item.item_type}
                          placeholder="Selecione um tipo"
                          onChange={(e) => updateItem(index, { item_type: e.target.value })}
                        />
                      </td>
                      <td data-label="Cidade">
                        <input
                          className="form-input"
                          list={`quote-manual-cidades-${rowKey}`}
                          value={getCidadeInputValue(item, rowKey)}
                          placeholder="Buscar cidade..."
                          onChange={(e) => handleCidadeInputChange(index, e.target.value, rowKey)}
                          onFocus={() => scheduleCidadeFetch(rowKey, getCidadeInputValue(item, rowKey))}
                        />
                      </td>
                      <td data-label="Destino">
                        <input
                          className="form-input"
                          list={DESTINO_DATALIST_ID}
                          value={item.city_name}
                          onChange={(e) => updateItem(index, { city_name: e.target.value })}
                        />
                      </td>
                      <td data-label="Produto">
                        <input
                          className="form-input"
                          list={`quote-manual-produtos-${rowKey}`}
                          value={item.title}
                          onChange={(e) =>
                            updateItem(index, {
                              title: e.target.value,
                              product_name: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td data-label="Inicio">
                        <input
                          className="form-input"
                          type="date"
                          value={item.start_date || ""}
                          min={dataMinimaInicio}
                          onChange={(e) => {
                            const nextStartRaw = e.target.value;
                            const nextStart =
                              nextStartRaw && dataMinimaInicio && nextStartRaw < dataMinimaInicio
                                ? dataMinimaInicio
                                : nextStartRaw;
                            const updates: Partial<ManualItem> = { start_date: nextStart };
                            if (item.end_date && nextStart && item.end_date < nextStart) {
                              updates.end_date = nextStart;
                            }
                            updateItem(index, updates);
                          }}
                        />
                      </td>
                      <td data-label="Fim">
                        <input
                          className="form-input"
                          type="date"
                          value={item.end_date || ""}
                          min={item.start_date || dataMinimaInicio || undefined}
                          onChange={(e) => {
                            const nextEnd = e.target.value;
                            const boundedEnd =
                              (item.start_date || dataMinimaInicio) &&
                              nextEnd &&
                              nextEnd < (item.start_date || dataMinimaInicio)
                                ? item.start_date || dataMinimaInicio
                                : nextEnd;
                            updateItem(index, { end_date: boundedEnd });
                          }}
                        />
                      </td>
                      <td data-label="Qtd">
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                        />
                      </td>
                      <td data-label="Total">
                        <input
                          className="form-input"
                          value={formatCurrency(item.total_amount)}
                          onChange={(e) => updateItem(index, { total_amount: normalizeNumber(e.target.value) })}
                        />
                      </td>
                      <td data-label="Taxas">
                        <input
                          className="form-input"
                          value={formatCurrency(item.taxes_amount || 0)}
                          onChange={(e) => updateItem(index, { taxes_amount: normalizeNumber(e.target.value) })}
                        />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {items.map((item, index) => {
            const rowKey = item.temp_id || `row-${index}`;
            const produtoOptions = buildProdutoSuggestions(item);
            return (
              <React.Fragment key={rowKey}>
                <datalist id={`quote-manual-cidades-${rowKey}`}>
                  {(cidadeSuggestions[rowKey] || []).map((cidade) => {
                    const label = formatCidadeLabel(cidade);
                    return <option key={cidade.id} value={label} />;
                  })}
                </datalist>
                <datalist id={`quote-manual-produtos-${rowKey}`}>
                  {produtoOptions.map((produto) => (
                    <option key={`${rowKey}-${produto}`} value={produto} />
                  ))}
                </datalist>
              </React.Fragment>
            );
          })}
          <datalist id={TIPO_DATALIST_ID}>
            {tipoOptions.map((tipo) => (
              <option key={tipo.id} value={tipo.label} />
            ))}
          </datalist>
          <datalist id={DESTINO_DATALIST_ID}>
            {destinoOptions.map((destino) => (
              <option key={destino} value={destino} />
            ))}
          </datalist>
        </div>

        <div className="mobile-stack-buttons" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-light w-full sm:w-auto" onClick={adicionarItem} disabled={saving}>
            Adicionar produto
          </button>
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar orcamento"}
          </button>
          <button type="button" className="btn btn-light w-full sm:w-auto" onClick={handleCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn btn-light w-full sm:w-auto" onClick={limparItens} disabled={saving}>
            Limpar itens
          </button>
        </div>

        {successId && (
          <div style={{ marginTop: 12 }}>
            Salvo com sucesso. <a href={`/orcamentos/${successId}`}>Abrir quote</a>
          </div>
        )}
      </div>
    </div>
  );
}
