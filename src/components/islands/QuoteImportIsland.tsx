import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  extractCvcQuoteFromImage,
  extractCvcQuoteFromPdf,
  extractCvcQuoteFromText,
} from "../../lib/quote/cvcPdfExtractor";
import { saveQuoteDraft } from "../../lib/quote/saveQuoteDraft";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import type { ImportResult, QuoteDraft, QuoteItemDraft } from "../../lib/quote/types";

type ImportMode = "pdf" | "image" | "text" | "circuit" | "circuit_products";
type ClienteOption = { id: string; nome: string; cpf?: string | null };
type TipoProdutoOption = { id: string; label: string };
type CidadeOption = { id: string; nome: string };

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeCityName(value: string) {
  return normalizeText(value || "").trim();
}

function isSeguroItem(item: QuoteItemDraft) {
  const normalized = normalizeText(item.item_type || "");
  return normalized.includes("seguro") && normalized.includes("viagem");
}

function normalizeTitleText(value: string) {
  return titleCaseWithExceptions(value || "");
}

function normalizeImportedItemText(item: QuoteItemDraft) {
  if (!item) return item;
  if (isSeguroItem(item)) {
    return {
      ...item,
      title: "SEGURO VIAGEM",
      product_name: "SEGURO VIAGEM",
      city_name: item.city_name ? normalizeTitleText(item.city_name) : item.city_name,
    };
  }
  const title = item.title ? normalizeTitleText(item.title) : item.title;
  const product = item.product_name ? normalizeTitleText(item.product_name) : item.product_name;
  const city = item.city_name ? normalizeTitleText(item.city_name) : item.city_name;
  return {
    ...item,
    title: title || item.title,
    product_name: product || item.product_name,
    city_name: city || item.city_name,
  };
}

function normalizeCpf(value: string) {
  return (value || "").replace(/\D/g, "");
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

const IMPORT_TIPO_DATALIST_ID = "quote-import-tipos-list";

function validateItem(item: QuoteItemDraft) {
  return Boolean(
    item.item_type &&
      item.quantity > 0 &&
      item.start_date &&
      item.title &&
      item.total_amount > 0
  );
}

function isCircuitItem(item: QuoteItemDraft) {
  return normalizeText(item.item_type) === "circuito";
}

type CircuitMeta = {
  codigo?: string;
  serie?: string;
  itinerario?: string[];
  tags?: string[];
};

function getCircuitMeta(item: QuoteItemDraft): CircuitMeta {
  const raw = (item.raw || {}) as { circuito_meta?: CircuitMeta };
  return raw.circuito_meta || {};
}

function dedupeQuoteItems(items: QuoteItemDraft[]) {
  const seen = new Map<string, QuoteItemDraft>();
  items.forEach((item) => {
    const keyParts = [
      normalizeText(item.item_type),
      normalizeText(item.product_name || ""),
      normalizeText(item.city_name || ""),
      item.start_date || "",
      Number(item.total_amount || 0).toFixed(2),
    ];
    const key = keyParts.join("|");
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  });
  return Array.from(seen.values());
}

function combineImportResults(
  circuitResult: ImportResult,
  productResult: ImportResult
): ImportResult {
  const combinedItems = dedupeQuoteItems([
    ...circuitResult.draft.items,
    ...productResult.draft.items,
  ]);
  const total = combinedItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const averageConfidence =
    combinedItems.length === 0
      ? 0
      : combinedItems.reduce((sum, item) => sum + Number(item.confidence || 0), 0) /
        combinedItems.length;
  const extractedAt = new Date().toISOString();
  const draft: QuoteDraft = {
    source: "CVC_TEXT",
    status: "IMPORTED",
    currency: circuitResult.draft.currency || productResult.draft.currency || "BRL",
    total,
    average_confidence: averageConfidence,
    items: combinedItems,
    meta: {
      file_name: "orcamento-circuito-produtos",
      page_count: 2,
      extracted_at: extractedAt,
    },
    raw_json: {
      source: "CVC_TEXT",
      combined_at: extractedAt,
      circuit: circuitResult.draft.raw_json,
      products: productResult.draft.raw_json,
    },
  };
  const logs = [
    ...circuitResult.logs,
    ...productResult.logs,
    {
      level: "INFO" as const,
      message: `Circuito + produtos importados (${combinedItems.length} itens).`,
    },
  ];
  return {
    draft,
    logs,
    debug_images: [...circuitResult.debug_images, ...productResult.debug_images],
  };
}

export default function QuoteImportIsland() {
  const [importMode, setImportMode] = useState<ImportMode>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [circuitText, setCircuitText] = useState("");
  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [debug, setDebug] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clientesErro, setClientesErro] = useState<string | null>(null);
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [clienteSuggestions, setClienteSuggestions] = useState<ClienteOption[]>([]);
  const clienteFetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tipoOptions, setTipoOptions] = useState<TipoProdutoOption[]>([]);
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
      if (clienteFetchTimeout.current) {
        clearTimeout(clienteFetchTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDebug(params.has("debug"));
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
          console.warn("[QuoteImport] Falha ao carregar tipos", error);
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
        console.warn("[QuoteImport] Erro ao carregar tipos", err);
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
          .select("id, nome, cpf")
          .order("nome", { ascending: true })
          .limit(500);
        if (error) throw error;
        if (!active) return;
        const lista = (data || []) as ClienteOption[];
        setClientes(lista);
        setClienteSuggestions(lista.slice(0, 200));
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

  function mergeClientes(base: ClienteOption[], extras: ClienteOption[]) {
    const map = new Map<string, ClienteOption>();
    base.forEach((c) => map.set(c.id, c));
    extras.forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  }

  async function loadClienteSuggestions(term: string) {
    const search = term.trim();
    if (!search) {
      setClienteSuggestions(clientes.slice(0, 200));
      return;
    }
    try {
      const { data, error } = await supabaseBrowser
        .from("clientes")
        .select("id, nome, cpf")
        .or(`nome.ilike.%${search}%,cpf.ilike.%${search}%`)
        .order("nome", { ascending: true })
        .limit(200);
      if (!isMountedRef.current) return;
      if (error) {
        console.warn("[QuoteImport] Falha ao buscar clientes", error);
        return;
      }
      const lista = (data || []) as ClienteOption[];
      setClienteSuggestions(lista);
      if (lista.length) {
        setClientes((prev) => mergeClientes(prev, lista));
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn("[QuoteImport] Erro ao buscar clientes", err);
    }
  }

  function scheduleClienteFetch(term: string) {
    if (clienteFetchTimeout.current) {
      clearTimeout(clienteFetchTimeout.current);
    }
    clienteFetchTimeout.current = setTimeout(() => loadClienteSuggestions(term), 250);
  }

  useEffect(() => {
    setDraft(null);
    setImportResult(null);
    setStatus(null);
    setError(null);
    setSuccessId(null);
    setExtracting(false);
    setSaving(false);
    if (!["text", "circuit_products"].includes(importMode)) {
      setTextInput("");
    }
    if (!["circuit", "circuit_products"].includes(importMode)) {
      setCircuitText("");
    }
    if (["text", "circuit", "circuit_products"].includes(importMode)) {
      setFile(null);
    }
  }, [importMode]);

  async function loadCidadeSuggestions(rowKey: string, term: string) {
    const search = term.trim();
    const limit = 25;
    let cidades: CidadeOption[] = [];
    try {
      const { data, error } = await supabaseBrowser.rpc("buscar_cidades", { q: search, limite: limit });
      if (!error && Array.isArray(data)) {
        cidades = (data as CidadeOption[]).filter((cidade) => cidade?.id && cidade.nome);
      } else if (error) {
        console.warn("[QuoteImport] RPC buscar_cidades falhou, tentando fallback.", error);
      }
    } catch (err) {
      console.warn("[QuoteImport] Erro ao buscar cidades (RPC)", err);
    }

    if (!cidades.length) {
      const pattern = search ? `%${search}%` : "%";
      try {
        const { data, error } = await supabaseBrowser
          .from("cidades")
          .select("id, nome")
          .ilike("nome", pattern)
          .order("nome", { ascending: true })
          .limit(limit);
        if (!isMountedRef.current) return;
        if (error) {
          console.warn("[QuoteImport] Falha ao buscar cidades", error);
          setCidadeSuggestions((prev) => ({ ...prev, [rowKey]: [] }));
          return;
        }
        cidades = (data || []).filter((cidade) => cidade?.id && cidade.nome);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.warn("[QuoteImport] Erro ao buscar cidades", err);
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
            next[cidade.id] = cidade.nome;
          }
        });
        return next;
      });
      setCidadeNameMap((prev) => {
        const next = { ...prev };
        cidades.forEach((cidade) => {
          if (cidade.id && cidade.nome) {
            const normalized = normalizeCityName(cidade.nome);
            if (!next[normalized]) {
              next[normalized] = cidade.id;
            }
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

  function getCidadeInputValue(item: QuoteItemDraft, rowKey: string) {
    if (Object.prototype.hasOwnProperty.call(cidadeInputValues, rowKey)) {
      return cidadeInputValues[rowKey] || "";
    }
    if (item.cidade_id) {
      return cidadeCache[item.cidade_id] || "";
    }
    const raw = item.raw as { city_label?: string } | undefined;
    return raw?.city_label ? normalizeTitleText(raw.city_label) : "";
  }

  function handleCidadeInputChange(index: number, value: string, rowKey: string) {
    if (!draft) return;
    const normalized = normalizeCityName(value);
    const matchedId = cidadeNameMap[normalized];
    const matchedCidade =
      cidadeSuggestions[rowKey]?.find((cidade) => normalizeCityName(cidade.nome) === normalized) ||
      Object.entries(cidadeCache)
        .map(([id, nome]) => ({ id, nome }))
        .find((cidade) => normalizeCityName(cidade.nome) === normalized);
    const displayValue = matchedCidade?.nome || value;
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
    if (clienteSuggestions.length) return clienteSuggestions;
    if (!clienteBusca.trim()) return clientes;
    const termo = normalizeText(clienteBusca);
    const cpfTermo = normalizeCpf(clienteBusca);
    return clientes.filter((c) => {
      if (normalizeText(c.nome).includes(termo)) return true;
      if (cpfTermo && normalizeCpf(c.cpf || "").includes(cpfTermo)) return true;
      return false;
    });
  }, [clientes, clienteBusca, clienteSuggestions]);

  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === clienteId) || null,
    [clientes, clienteId]
  );

  const canConfirm = useMemo(() => {
    if (!draft?.items?.length) return false;
    return draft.items.every(validateItem);
  }, [draft]);

  const canExtractInput =
    importMode === "text"
      ? Boolean(textInput.trim())
      : importMode === "circuit"
      ? Boolean(circuitText.trim())
      : importMode === "circuit_products"
      ? Boolean(textInput.trim() && circuitText.trim())
      : Boolean(file);

  function updateDraftItems(items: QuoteItemDraft[]) {
    if (!draft) return;
    const ordered = items.map((item, index) =>
      normalizeImportedItemText({
        ...item,
        order_index: index,
        taxes_amount: Number(item.taxes_amount || 0),
      })
    );
    const subtotal = ordered.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    const taxesTotal = ordered.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0);
    const total = subtotal + taxesTotal;
    const avgConf = ordered.length
      ? ordered.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / ordered.length
      : 0;
    setDraft({
      ...draft,
      items: ordered,
      total,
      average_confidence: avgConf,
    });
  }

  function handleClienteChange(value: string) {
    setClienteBusca(value);
    const texto = normalizeText(value);
    const cpfTexto = normalizeCpf(value);
    const catalogo = clienteSuggestions.length ? clienteSuggestions : clientes;
    const achado = catalogo.find((c) => {
      const cpf = normalizeCpf(c.cpf || "");
      return normalizeText(c.nome) === texto || (cpfTexto && cpf === cpfTexto);
    });
    scheduleClienteFetch(value);
    if (achado) {
      setClienteId(achado.id);
      return;
    }
    if (clienteId) setClienteId("");
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

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    setSuccessId(null);
    setStatus("Iniciando OCR...");
    try {
      let result: ImportResult | null = null;
      if (importMode === "text") {
        const rawText = textInput.trim();
        if (!rawText) {
          setError("Cole o texto do orçamento para importar.");
          setExtracting(false);
          return;
        }
        const textFile = new File([rawText], `orcamento-texto-${Date.now()}.txt`, {
          type: "text/plain",
        });
        setFile(textFile);
        setStatus("Processando texto...");
        result = await extractCvcQuoteFromText(rawText, {
          debug,
          onProgress: (message) => setStatus(message),
        });
      } else if (importMode === "circuit") {
        const rawText = circuitText.trim();
        if (!rawText) {
          setError("Cole o texto do circuito para importar.");
          setExtracting(false);
          return;
        }
        const textFile = new File([rawText], `orcamento-circuito-${Date.now()}.txt`, {
          type: "text/plain",
        });
        setFile(textFile);
        setStatus("Processando circuito...");
        result = await extractCvcQuoteFromText(rawText, {
          debug,
          onProgress: (message) => setStatus(message),
        });
      } else if (importMode === "circuit_products") {
        const circuitValue = circuitText.trim();
        const productValue = textInput.trim();
        if (!circuitValue || !productValue) {
          setError("Cole o texto do circuito e dos produtos para importar.");
          setExtracting(false);
          return;
        }
        setStatus("Processando circuito...");
        const circuitResult = await extractCvcQuoteFromText(circuitValue, {
          debug,
          onProgress: (message) => setStatus(`Circuito: ${message}`),
        });
        setStatus("Processando produtos...");
        const productResult = await extractCvcQuoteFromText(productValue, {
          debug,
          onProgress: (message) => setStatus(`Produtos: ${message}`),
        });
        result = combineImportResults(circuitResult, productResult);
        const combinedText = `${circuitValue}\n\n${productValue}`;
        const combinedFile = new File(
          [combinedText],
          `orcamento-circuito-produtos-${Date.now()}.txt`,
          { type: "text/plain" }
        );
        setFile(combinedFile);
      } else {
        if (!file) {
          setError(importMode === "image" ? "Selecione uma imagem para importar." : "Selecione um PDF para importar.");
          setExtracting(false);
          return;
        }
        result =
          importMode === "image"
            ? await extractCvcQuoteFromImage(file, { debug, onProgress: (message) => setStatus(message) })
            : await extractCvcQuoteFromPdf(file, { debug, onProgress: (message) => setStatus(message) });
      }

      if (!result) {
        setError("Falha ao extrair itens.");
        return;
      }
      setImportResult(result);
      const orderedItems = result.draft.items.map((item, index) =>
        normalizeImportedItemText({
          ...item,
          cidade_id: item.cidade_id || null,
          order_index: index,
          taxes_amount: Number(item.taxes_amount || 0),
        })
      );
      setDraft({ ...result.draft, items: orderedItems });
      setCidadeInputValues({});
      setCidadeSuggestions({});
      setCidadeCache({});
      setCidadeNameMap({});
      setStatus("Extracao concluida.");
    } catch (err: any) {
      setError(err?.message || "Erro ao extrair itens.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!draft || !file) return;
    const resolvedClientId =
      clienteId ||
      clientes.find((c) => normalizeText(c.nome) === normalizeText(clienteBusca))?.id ||
      clientes.find((c) => normalizeCpf(c.cpf || "") === normalizeCpf(clienteBusca))?.id ||
      "";
    if (!resolvedClientId) {
      setError("Selecione um cliente antes de salvar.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessId(null);
    try {
      const result = await saveQuoteDraft({
        draft,
        file,
        clientId: resolvedClientId,
        importResult: importResult || undefined,
        debug,
      });
      setSuccessId(result.quote_id);
      setStatus(`Salvo como ${result.status}.`);
      if (typeof window !== "undefined") {
        window.location.href = "/orcamentos/consulta";
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar quote.");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(index: number, updates: Partial<QuoteItemDraft>) {
    if (!draft) return;
    const next = draft.items.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, ...updates };
      const quantity = Math.max(1, Math.round(Number(updated.quantity) || 1));
      const total = Number(updated.total_amount) || 0;
      const unitPrice = quantity > 0 ? total / quantity : total;
      return {
        ...updated,
        quantity,
        total_amount: total,
        unit_price: unitPrice,
      };
    });
    updateDraftItems(next);
  }

  function updateCircuitMeta(index: number, updates: Partial<CircuitMeta>) {
    if (!draft) return;
    const item = draft.items[index];
    if (!item) return;
    const meta = { ...getCircuitMeta(item), ...updates };
    const itinerario = meta.itinerario?.filter(Boolean) || [];
    updateItem(index, {
      raw: { ...item.raw, circuito_meta: meta },
      city_name: itinerario.length ? itinerario.join(" - ") : item.city_name,
    });
  }

  function updateCircuitSegments(
    index: number,
    updater: (segments: QuoteItemDraft["segments"]) => QuoteItemDraft["segments"]
  ) {
    if (!draft) return;
    const item = draft.items[index];
    if (!item) return;
    const currentDays = (item.segments || []).filter((seg) => seg.segment_type === "circuit_day");
    const otherSegments = (item.segments || []).filter((seg) => seg.segment_type !== "circuit_day");
    const nextDays = updater(currentDays).map((seg, idx) => ({
      ...seg,
      order_index: idx,
    }));
    updateItem(index, { segments: [...otherSegments, ...nextDays] });
  }

  function moveItem(index: number, direction: "up" | "down") {
    if (!draft) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= draft.items.length) return;
    const next = [...draft.items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    updateDraftItems(next);
  }

  return (
    <div className="page-content-wrap">
      <div className="card-base" style={{ marginBottom: 16 }}>
        <h2 className="page-title">Importacao de orcamentos (CVC)</h2>
        <p className="page-subtitle">
          Escolha PDF, imagem ou texto. Revise e confirme para salvar.
        </p>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">Cliente *</label>
            <input
              className="form-input"
              list="listaClientes"
              placeholder="Buscar cliente..."
              value={clienteSelecionado?.nome || clienteBusca}
              onChange={(e) => handleClienteChange(e.target.value)}
              onBlur={handleClienteBlur}
              onFocus={(e) => scheduleClienteFetch(e.currentTarget.value)}
              required
            />
            <datalist id="listaClientes">
              {clientesFiltrados.slice(0, 200).map((c) => (
                <React.Fragment key={c.id}>
                  <option
                    value={c.nome}
                    label={c.cpf ? `CPF: ${c.cpf}` : undefined}
                  />
                  {c.cpf ? <option value={c.cpf} label={c.nome} /> : null}
                </React.Fragment>
              ))}
            </datalist>
            {carregandoClientes && (
              <small style={{ color: "#64748b" }}>Carregando clientes...</small>
            )}
            {clientesErro && <small style={{ color: "#b91c1c" }}>{clientesErro}</small>}
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">Tipo de importacao</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "pdf"}
                  onChange={() => setImportMode("pdf")}
                />
                PDF
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "image"}
                  onChange={() => setImportMode("image")}
                />
                Imagem
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "text"}
                  onChange={() => setImportMode("text")}
                />
                Texto
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "circuit"}
                  onChange={() => setImportMode("circuit")}
                />
                Circuito
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "circuit_products"}
                  onChange={() => setImportMode("circuit_products")}
                />
                Circuito + Produtos
              </label>
            </div>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          {["text", "circuit", "circuit_products"].includes(importMode) ? (
            <div
              className="form-group"
              style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}
            >
              {importMode === "circuit_products" ? (
                <>
                  <div>
                    <label className="form-label">Texto do circuito</label>
                    <textarea
                      className="form-input"
                      rows={6}
                      placeholder="Cole aqui o texto do circuito (dia a dia + resumo)."
                      value={circuitText}
                      onChange={(e) => setCircuitText(e.target.value)}
                    />
                    <small style={{ color: "#475569" }}>
                      Informe o trecho que descreve o circuito com dias, cidades e o valor total.
                    </small>
                  </div>
                  <div>
                    <label className="form-label">Texto dos produtos</label>
                    <textarea
                      className="form-input"
                      rows={6}
                      placeholder="Cole aqui o texto com os produtos adicionais (Seguro, Aéreo, Serviços, etc.)."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                    <small style={{ color: "#475569" }}>
                      Utilize o parser de texto para trazer Seguro Viagem, Aéreo e outros itens.
                    </small>
                  </div>
                </>
              ) : (
                <div>
                  <label className="form-label">
                    Texto do {importMode === "circuit" ? "circuito" : "orçamento"}
                  </label>
                  <textarea
                    className="form-input"
                    rows={8}
                    placeholder={
                      importMode === "circuit"
                        ? "Cole aqui o texto completo do circuito (com os dias detalhados)."
                        : "Cole aqui o texto do orçamento"
                    }
                    value={importMode === "circuit" ? circuitText : textInput}
                    onChange={(e) =>
                      importMode === "circuit" ? setCircuitText(e.target.value) : setTextInput(e.target.value)
                    }
                  />
                  {importMode === "circuit" && (
                    <small style={{ color: "#475569" }}>
                      O circuito será importado com o dia a dia e o valor total. Outros elementos (Aéreo,
                      Seguro Viagem ou Serviços) aproveitam o parser de texto.
                    </small>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">
                {importMode === "image" ? "Arquivo de imagem" : "Arquivo PDF"}
              </label>
              <input
                type="file"
                accept={importMode === "image" ? "image/*" : "application/pdf"}
                className="form-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}
          <div className="form-group" style={{ alignSelf: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExtract}
              disabled={!canExtractInput || extracting}
            >
              {extracting ? "Extraindo..." : "Extrair"}
            </button>
          </div>
        </div>
        {status && <div style={{ marginTop: 12, fontSize: 14 }}>{status}</div>}
        {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>{error}</div>}
      </div>

      {draft && (
        <div className="card-base">
          <h3 className="card-title">Preview dos itens</h3>
          <div style={{ marginBottom: 12, fontSize: 14 }}>
            Total estimado: R$ {formatCurrency(draft.total)}
          </div>
          <div className="table-container overflow-x-auto">
            <table className="table-default table-compact quote-items-table">
              <thead>
                <tr>
                  <th className="order-cell">Ordem</th>
                  <th>Tipo</th>
                  <th>Produto</th>
                  <th>Cidade</th>
                  <th>Destino</th>
                  <th>Inicio</th>
                  <th>Fim</th>
                  <th>Qtd</th>
                  <th>Total</th>
                  <th>Taxas</th>
                </tr>
              </thead>
              <tbody>
                {draft.items.map((item, index) => {
                  const needsReview = item.confidence < 0.7 || !validateItem(item);
                  const circuitMeta = getCircuitMeta(item);
                  const circuitDays = (item.segments || [])
                    .filter((seg) => seg.segment_type === "circuit_day")
                    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                  const rowKey = item.temp_id || `row-${index}`;

                  return (
                    <React.Fragment key={item.temp_id}>
                      <tr style={needsReview ? { background: "#fef3c7" } : undefined}>
                        <td className="order-cell">
                          <div className="order-controls">
                            <button
                              type="button"
                              className="btn-icon"
                              title="Mover para cima"
                              onClick={() => moveItem(index, "up")}
                              disabled={index === 0}
                              style={{ padding: "2px 6px" }}
                            >
                              ⬆️
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Mover para baixo"
                              onClick={() => moveItem(index, "down")}
                              disabled={index === draft.items.length - 1}
                              style={{ padding: "2px 6px" }}
                            >
                              ⬇️
                            </button>
                          </div>
                        </td>
                        <td>
                          <input
                            className="form-input"
                            list={IMPORT_TIPO_DATALIST_ID}
                            value={item.item_type}
                            placeholder="Selecione um tipo"
                            onChange={(e) => updateItem(index, { item_type: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            value={item.title}
                            onChange={(e) =>
                              updateItem(index, { title: e.target.value, product_name: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            list={`quote-import-cidades-${rowKey}`}
                            value={getCidadeInputValue(item, rowKey)}
                            placeholder="Buscar cidade..."
                            onChange={(e) => handleCidadeInputChange(index, e.target.value, rowKey)}
                            onFocus={() => scheduleCidadeFetch(rowKey, getCidadeInputValue(item, rowKey))}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            value={item.city_name}
                            onChange={(e) => updateItem(index, { city_name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="date"
                            value={item.start_date || ""}
                            onChange={(e) => updateItem(index, { start_date: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="date"
                            value={item.end_date || ""}
                            onChange={(e) => updateItem(index, { end_date: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            value={formatCurrency(item.total_amount)}
                            onChange={(e) => updateItem(index, { total_amount: normalizeNumber(e.target.value) })}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input"
                            value={formatCurrency(item.taxes_amount || 0)}
                            onChange={(e) => updateItem(index, { taxes_amount: normalizeNumber(e.target.value) })}
                          />
                        </td>
                      </tr>
                      <datalist id={`quote-import-cidades-${rowKey}`}>
                        {(cidadeSuggestions[rowKey] || []).map((cidade) => (
                          <option key={cidade.id} value={cidade.nome} />
                        ))}
                      </datalist>

                      {isCircuitItem(item) && (
                        <tr>
                          <td colSpan={10}>
                            <div style={{ padding: "8px 4px 16px", borderTop: "1px solid #e2e8f0" }}>
                              <div className="form-row">
                                <div className="form-group">
                                  <label className="form-label">Codigo</label>
                                  <input
                                    className="form-input"
                                    value={circuitMeta.codigo || ""}
                                    onChange={(e) => updateCircuitMeta(index, { codigo: e.target.value })}
                                  />
                                </div>
                                <div className="form-group">
                                  <label className="form-label">Serie</label>
                                  <input
                                    className="form-input"
                                    value={circuitMeta.serie || ""}
                                    onChange={(e) => updateCircuitMeta(index, { serie: e.target.value })}
                                  />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                  <label className="form-label">Tags (uma por linha)</label>
                                  <textarea
                                    className="form-input"
                                    rows={2}
                                    value={(circuitMeta.tags || []).join("\n")}
                                    onChange={(e) =>
                                      updateCircuitMeta(index, {
                                        tags: e.target.value
                                          .split(/\r?\n/)
                                          .map((val) => val.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                  />
                                </div>
                              </div>

                              <div className="form-group" style={{ marginTop: 8 }}>
                                <label className="form-label">Itinerario (uma cidade por linha)</label>
                                <textarea
                                  className="form-input"
                                  rows={3}
                                  value={(circuitMeta.itinerario || []).join("\n")}
                                  onChange={(e) =>
                                    updateCircuitMeta(index, {
                                      itinerario: e.target.value
                                        .split(/\r?\n/)
                                        .map((val) => val.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                />
                              </div>

                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontWeight: 600, marginBottom: 8 }}>Dia a dia</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {circuitDays.map((seg, segIndex) => {
                                    const data = (seg.data || {}) as {
                                      dia?: number;
                                      titulo?: string;
                                      descricao?: string;
                                    };
                                    return (
                                      <div
                                        key={`circuit-${item.temp_id}-${segIndex}`}
                                        style={{
                                          border: "1px solid #e2e8f0",
                                          borderRadius: 8,
                                          padding: 10,
                                          background: "#f8fafc",
                                        }}
                                      >
                                        <div className="form-row">
                                          <div className="form-group">
                                            <label className="form-label">Dia</label>
                                            <input
                                              className="form-input"
                                              type="number"
                                              min={1}
                                              value={data.dia ?? segIndex + 1}
                                              onChange={(e) =>
                                                updateCircuitSegments(index, (segments) =>
                                                  segments.map((segmento, i) =>
                                                    i === segIndex
                                                      ? {
                                                          ...segmento,
                                                          data: {
                                                            ...(segmento.data || {}),
                                                            dia: Number(e.target.value) || segIndex + 1,
                                                          },
                                                        }
                                                      : segmento
                                                  )
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Cidade / Titulo</label>
                                            <input
                                              className="form-input"
                                              value={data.titulo || ""}
                                              onChange={(e) =>
                                                updateCircuitSegments(index, (segments) =>
                                                  segments.map((segmento, i) =>
                                                    i === segIndex
                                                      ? {
                                                          ...segmento,
                                                          data: {
                                                            ...(segmento.data || {}),
                                                            titulo: e.target.value,
                                                          },
                                                        }
                                                      : segmento
                                                  )
                                                )
                                              }
                                            />
                                          </div>
                                          <div
                                            className="form-group"
                                            style={{ alignSelf: "flex-end", display: "flex", gap: 6 }}
                                          >
                                            <button
                                              type="button"
                                              className="btn btn-light"
                                              onClick={() =>
                                                updateCircuitSegments(index, (segments) => {
                                                  if (segIndex === 0) return segments;
                                                  const next = [...segments];
                                                  const [removed] = next.splice(segIndex, 1);
                                                  next.splice(segIndex - 1, 0, removed);
                                                  return next;
                                                })
                                              }
                                              disabled={segIndex === 0}
                                            >
                                              ⬆️
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-light"
                                              onClick={() =>
                                                updateCircuitSegments(index, (segments) => {
                                                  if (segIndex >= segments.length - 1) return segments;
                                                  const next = [...segments];
                                                  const [removed] = next.splice(segIndex, 1);
                                                  next.splice(segIndex + 1, 0, removed);
                                                  return next;
                                                })
                                              }
                                              disabled={segIndex >= circuitDays.length - 1}
                                            >
                                              ⬇️
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-light"
                                              onClick={() =>
                                                updateCircuitSegments(index, (segments) =>
                                                  segments.filter((_, i) => i !== segIndex)
                                                )
                                              }
                                            >
                                              Remover
                                            </button>
                                          </div>
                                        </div>
                                        <div className="form-group">
                                          <label className="form-label">Descricao</label>
                                          <textarea
                                            className="form-input"
                                            rows={3}
                                            value={data.descricao || ""}
                                            onChange={(e) =>
                                              updateCircuitSegments(index, (segments) =>
                                                segments.map((segmento, i) =>
                                                  i === segIndex
                                                    ? {
                                                        ...segmento,
                                                        data: {
                                                          ...(segmento.data || {}),
                                                          descricao: e.target.value,
                                                        },
                                                      }
                                                    : segmento
                                                )
                                              )
                                            }
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  style={{ marginTop: 8 }}
                                  onClick={() =>
                                    updateCircuitSegments(index, (segments) => [
                                      ...segments,
                                      {
                                        segment_type: "circuit_day",
                                        order_index: segments.length,
                                        data: { dia: segments.length + 1, titulo: "", descricao: "" },
                                      },
                                    ])
                                  }
                                >
                                  Adicionar dia
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <datalist id={IMPORT_TIPO_DATALIST_ID}>
              {tipoOptions.map((tipo) => (
                <option key={tipo.id} value={tipo.label} />
              ))}
            </datalist>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !draft.items.length || !file}
            >
              {saving ? "Salvando..." : "Confirmar e salvar"}
            </button>
            <div style={{ fontSize: 13 }}>
              {canConfirm
                ? "Valido para CONFIRMED."
                : "Alguns itens precisam de ajuste; status ficara IMPORTED."}
            </div>
          </div>

          {successId && (
            <div style={{ marginTop: 12 }}>
              Salvo com sucesso. <a href={`/orcamentos/${successId}`}>Abrir quote</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
