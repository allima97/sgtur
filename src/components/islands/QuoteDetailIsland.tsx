import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import { exportQuotePdfById } from "../../lib/quote/exportQuotePdfClient";

type QuoteRecord = {
  id: string;
  status: string;
  status_negociacao?: string | null;
  currency: string;
  total: number;
  created_at?: string | null;
  average_confidence?: number | null;
  source_file_path?: string | null;
  source_file_url?: string | null;
  client_id?: string | null;
  cliente?: { id: string; nome?: string | null; cpf?: string | null } | null;
};

type QuoteItemRecord = {
  id: string;
  item_type: string;
  title: string | null;
  product_name: string | null;
  city_name: string | null;
  cidade_id?: string | null;
  cidade?: { id: string; nome?: string | null } | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  taxes_amount?: number | null;
  start_date: string | null;
  end_date: string | null;
  currency: string | null;
  confidence: number | null;
  order_index?: number | null;
  raw?: Record<string, unknown> | null;
  segments?: QuoteItemSegmentRecord[] | null;
};

type QuoteItemSegmentRecord = {
  id?: string;
  segment_type: string;
  data: Record<string, unknown>;
  order_index?: number | null;
};

type QuoteDetailTipoProdutoOption = {
  id: string;
  label: string;
};

type ClienteOption = {
  id: string;
  nome: string;
};

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeNumber(value: string) {
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLookupText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeCityName(value: string) {
  return normalizeLookupText(value);
}

function getQuoteItemRowKey(item: QuoteItemRecord, index: number) {
  return item.id || `quote-item-${index}`;
}

const EXCLUDED_PRODUTO_TIPOS = new Set(
  [
    "Seguro viagem",
    "Passagem Aérea",
    "Passagem Facial",
    "Aéreo",
    "Chip",
    "Aluguel de Carro",
  ].map((value) => normalizeLookupText(value))
);

const TIPO_DATALIST_ID = "quote-item-tipos-list";
const QUOTE_CLIENTES_DATALIST_ID = "quote-clientes-list";

function isCircuitItem(item: QuoteItemRecord) {
  return (item.item_type || "").trim().toLowerCase() === "circuito";
}

type CircuitMeta = {
  codigo?: string;
  serie?: string;
  itinerario?: string[];
  tags?: string[];
};

function getCircuitMeta(item: QuoteItemRecord): CircuitMeta {
  const raw = (item.raw || {}) as { circuito_meta?: CircuitMeta };
  return raw.circuito_meta || {};
}

function validateItem(item: QuoteItemRecord) {
  return Boolean(
    item.item_type &&
      item.quantity > 0 &&
      item.start_date &&
      item.title &&
      item.total_amount > 0
  );
}

export default function QuoteDetailIsland(props: {
  quote: QuoteRecord;
  items: QuoteItemRecord[];
}) {
  const isFechado = normalizeLookupText(props.quote.status_negociacao || "") === "fechado";
  const [items, setItems] = useState<QuoteItemRecord[]>(
    (props.items || []).map((item, index) => ({
      ...item,
      taxes_amount: Number(item.taxes_amount || 0),
      raw: item.raw || {},
      segments: item.segments || [],
      order_index: typeof item.order_index === "number" ? item.order_index : index,
    }))
  );
  const [status, setStatus] = useState(props.quote.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [exportDiscount, setExportDiscount] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const subtotalAtual = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [items]
  );
  const taxesAtual = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0),
    [items]
  );
  const totalAtual = useMemo(() => subtotalAtual, [subtotalAtual]);
  const descontoAtual = useMemo(() => normalizeNumber(exportDiscount), [exportDiscount]);
  const [cidadeInputValues, setCidadeInputValues] = useState<Record<string, string>>({});
  const [cidadeSuggestions, setCidadeSuggestions] = useState<
    Record<string, { id: string; nome: string }[]>
  >({});
  const [cidadeCache, setCidadeCache] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    props.items.forEach((item) => {
      if (item.cidade_id && item.cidade?.nome) {
        initial[item.cidade_id] = item.cidade.nome;
      }
    });
    return initial;
  });
  const [cidadeNameMap, setCidadeNameMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    props.items.forEach((item) => {
      if (item.cidade_id && item.cidade?.nome) {
        initial[normalizeCityName(item.cidade.nome)] = item.cidade_id;
      }
    });
    return initial;
  });
  const fetchTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      Object.values(fetchTimeouts.current).forEach((timeout) => clearTimeout(timeout));
    };
  }, []);
  useEffect(() => {
    setCidadeCache((prev) => {
      const next = { ...prev };
      props.items.forEach((item) => {
        if (item.cidade_id && item.cidade?.nome) {
          next[item.cidade_id] = item.cidade.nome;
        }
      });
      return next;
    });
    setCidadeNameMap((prev) => {
      const next = { ...prev };
      props.items.forEach((item) => {
        if (item.cidade_id && item.cidade?.nome) {
          next[normalizeCityName(item.cidade.nome)] = item.cidade_id;
        }
      });
      return next;
    });
  }, [props.items]);

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteBusca, setClienteBusca] = useState(props.quote.cliente?.nome || "");
  const [clienteId, setClienteId] = useState(props.quote.client_id || "");
  useEffect(() => {
    setClienteBusca(props.quote.cliente?.nome || "");
    setClienteId(props.quote.client_id || "");
  }, [props.quote.cliente?.nome, props.quote.client_id]);
  useEffect(() => {
    let active = true;
    async function carregarClientes() {
      try {
        const { data, error } = await supabaseBrowser
          .from("clientes")
          .select("id, nome")
          .order("nome", { ascending: true })
          .limit(500);
        if (!active) return;
        if (error) {
          console.warn("[QuoteDetail] Falha ao carregar clientes", error);
          return;
        }
        setClientes(
          (data || [])
            .filter((cliente) => cliente?.id && cliente.nome)
            .map((cliente) => ({ id: cliente.id, nome: cliente.nome }))
        );
      } catch (err) {
        if (!active) return;
        console.warn("[QuoteDetail] Erro ao carregar clientes", err);
      }
    }
    carregarClientes();
    return () => {
      active = false;
    };
  }, []);

  const [tipoOptions, setTipoOptions] = useState<QuoteDetailTipoProdutoOption[]>([]);
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
          console.warn("[QuoteDetail] Falha ao carregar tipos", error);
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
        console.warn("[QuoteDetail] Erro ao carregar tipos", err);
      }
    }
    carregarTipos();
    return () => {
      active = false;
    };
  }, []);

  const tipoLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    tipoOptions.forEach((option) => {
      const key = normalizeLookupText(option.label);
      if (key) map.set(key, option.id);
    });
    return map;
  }, [tipoOptions]);

  const canConfirm = useMemo(() => {
    if (!items.length) return false;
    return items.every(validateItem);
  }, [items]);

  function updateItem(index: number, updates: Partial<QuoteItemRecord>) {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const updated = { ...current, ...updates };
      const quantity = Math.max(1, Math.round(Number(updated.quantity) || 1));
      const total = Number(updated.total_amount) || 0;
      const unitPrice = quantity > 0 ? total / quantity : total;
      updated.quantity = quantity;
      updated.total_amount = total;
      updated.unit_price = unitPrice;
      next[index] = updated;
      return next;
    });
  }

  async function syncProductsCatalog(itemsToSync: QuoteItemRecord[]) {
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
          console.warn("[QuoteDetail] Falha ao buscar produto", selectErr);
          continue;
        }
        if (existing?.id) {
          const { error: updateErr } = await supabaseBrowser
            .from("produtos")
            .update(payload)
            .eq("id", existing.id);
          if (updateErr) {
            console.warn("[QuoteDetail] Falha ao atualizar produto", updateErr);
          }
        } else {
          const { error: insertErr } = await supabaseBrowser.from("produtos").insert(payload);
          if (insertErr) {
            console.warn("[QuoteDetail] Falha ao inserir produto", insertErr);
          }
        }
      } catch (err) {
        console.warn("[QuoteDetail] Erro ao sincronizar produto", err);
      }
    }
  }

  async function loadCidadeSuggestions(rowKey: string, term: string) {
    const search = term.trim();
    const pattern = search ? `%${search}%` : "%";
    try {
      const { data, error } = await supabaseBrowser
        .from("cidades")
        .select("id, nome")
        .ilike("nome", pattern)
        .order("nome", { ascending: true })
        .limit(25);
      if (!isMountedRef.current) return;
      if (error) {
        console.warn("[QuoteDetail] Falha ao buscar cidades", error);
        setCidadeSuggestions((prev) => ({ ...prev, [rowKey]: [] }));
        return;
      }
      const cidades = (data || []).filter((cidade) => cidade?.id && cidade.nome);
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
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn("[QuoteDetail] Erro ao buscar cidades", err);
    }
  }

  function scheduleCidadeFetch(rowKey: string, term: string) {
    const existing = fetchTimeouts.current[rowKey];
    if (existing) {
      clearTimeout(existing);
    }
    fetchTimeouts.current[rowKey] = setTimeout(() => loadCidadeSuggestions(rowKey, term), 250);
  }

  function handleClienteInputChange(value: string) {
    setClienteBusca(value);
    const normalized = normalizeLookupText(value);
    const match = clientes.find((cliente) => normalizeLookupText(cliente.nome) === normalized);
    setClienteId(match?.id || "");
  }

  function getCidadeInputValue(item: QuoteItemRecord, rowKey: string) {
    if (!rowKey) return "";
    if (Object.prototype.hasOwnProperty.call(cidadeInputValues, rowKey)) {
      return cidadeInputValues[rowKey] || "";
    }
    if (item.cidade_id) {
      return cidadeCache[item.cidade_id] || item.cidade?.nome || "";
    }
    const raw = (item.raw || {}) as { city_label?: string };
    return item.cidade?.nome || raw.city_label || "";
  }

  function handleCidadeInputChange(index: number, value: string, rowKey: string) {
    const current = items[index];
    if (!current) return;
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

  function updateCircuitMeta(index: number, updates: Partial<CircuitMeta>) {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const meta = { ...getCircuitMeta(current), ...updates };
      const itinerario = meta.itinerario?.filter(Boolean) || [];
      next[index] = {
        ...current,
        raw: { ...(current.raw || {}), circuito_meta: meta },
        city_name: itinerario.length ? itinerario.join(" - ") : current.city_name,
      };
      return next;
    });
  }

  function updateCircuitSegments(
    index: number,
    updater: (segments: QuoteItemSegmentRecord[]) => QuoteItemSegmentRecord[]
  ) {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const currentDays = (current.segments || []).filter((seg) => seg.segment_type === "circuit_day");
      const otherSegments = (current.segments || []).filter((seg) => seg.segment_type !== "circuit_day");
      const nextDays = updater(currentDays).map((seg, idx) => ({ ...seg, order_index: idx }));
      next[index] = {
        ...current,
        segments: [...otherSegments, ...nextDays],
      };
      return next;
    });
  }

  function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    const reindexed = next.map((item, idx) => ({
      ...item,
      order_index: idx,
    }));
    setItems(reindexed);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = items.map((item, index) => ({
        id: item.id,
        quote_id: props.quote.id,
        item_type: item.item_type,
        title: item.title,
        product_name: item.product_name,
        city_name: item.city_name,
        cidade_id: item.cidade_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        taxes_amount: Number(item.taxes_amount || 0),
        start_date: item.start_date || null,
        end_date: item.end_date || item.start_date || null,
        currency: item.currency || props.quote.currency,
        raw: item.raw || {},
        order_index: typeof item.order_index === "number" ? item.order_index : index,
      }));

      const { error: itemError } = await supabaseBrowser
        .from("quote_item")
        .upsert(payload, { onConflict: "id" });

      if (itemError) throw itemError;

      const itemIds = items.map((item) => item.id);
      if (itemIds.length) {
        const { error: deleteSegErr } = await supabaseBrowser
          .from("quote_item_segment")
          .delete()
          .in("quote_item_id", itemIds);
        if (deleteSegErr) throw deleteSegErr;

        const segmentPayloads = items.flatMap((item) =>
          (item.segments || []).map((segment, idx) => ({
            quote_item_id: item.id,
            segment_type: segment.segment_type,
            data: segment.data || {},
            order_index: typeof segment.order_index === "number" ? segment.order_index : idx,
          }))
        );
        if (segmentPayloads.length) {
          const { error: segErr } = await supabaseBrowser
            .from("quote_item_segment")
            .insert(segmentPayloads);
          if (segErr) throw segErr;
        }
      }

      await syncProductsCatalog(items);
      const subtotal = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
      const taxes = items.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0);
      const total = subtotal + taxes;
      const nextStatus = canConfirm ? "CONFIRMED" : status;

      const { error: quoteError } = await supabaseBrowser
        .from("quote")
        .update({
          subtotal,
          taxes,
          total,
          status: nextStatus,
          client_id: clienteId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", props.quote.id);

      if (quoteError) throw quoteError;

      setStatus(nextStatus);
      setSuccess("Atualizado com sucesso.");
      setIsEditing(false);
      if (typeof window !== "undefined") {
        window.location.href = "/orcamentos/consulta";
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const handleExport = useCallback(
    async (showItemValues: boolean) => {
      setExporting(true);
      setExportError(null);
      try {
        await exportQuotePdfById({
          quoteId: props.quote.id,
          showItemValues,
          showSummary: showItemValues && showSummary,
          discount: descontoAtual,
        });
      } catch (err: any) {
        setExportError(err?.message || "Erro ao exportar PDF.");
      } finally {
        setExporting(false);
      }
    },
    [props.quote.id, showSummary, descontoAtual]
  );

  const autoExportRef = useRef(false);
  useEffect(() => {
    if (isFechado) {
      setIsEditing(false);
    }
  }, [isFechado]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("pdf") === "1") {
      if (autoExportRef.current) return;
      autoExportRef.current = true;
      handleExport(true);
    }
  }, [handleExport]);

  return (
    <div className="page-content-wrap">
      <div className="card-base" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Quote</h1>
        <div style={{ fontSize: 14 }}>
          Status: {props.quote.status_negociacao || "Enviado"} | Total: R$ {formatCurrency(totalAtual)}
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <label className="form-label" style={{ marginBottom: 0 }}>
            Cliente
          </label>
          <input
            className="form-input"
            list={QUOTE_CLIENTES_DATALIST_ID}
            value={clienteBusca}
            onChange={(e) => handleClienteInputChange(e.target.value)}
            disabled={!isEditing}
            placeholder="Selecione um cliente"
            style={{ minWidth: 220 }}
          />
        </div>
        <datalist id={QUOTE_CLIENTES_DATALIST_ID}>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.nome} />
          ))}
        </datalist>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleExport(true)}
            disabled={exporting}
          >
            {exporting ? "Gerando..." : "Exportar PDF (com valores)"}
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => handleExport(false)}
            disabled={exporting}
          >
            Exportar PDF (somente total)
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showSummary}
              onChange={(e) => setShowSummary(e.target.checked)}
            />
            Mostrar resumo de servicos
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              Desconto
            </label>
            <input
              className="form-input"
              value={exportDiscount}
              onChange={(e) => setExportDiscount(e.target.value)}
              placeholder="0,00"
              style={{ width: 120 }}
            />
          </div>
        </div>
        {exportError && <div style={{ marginTop: 8, color: "#b91c1c" }}>{exportError}</div>}
      </div>

      <div className="card-base">
        <h3 className="card-title">Itens</h3>
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
              {items.map((item, index) => {
                const circuitMeta = getCircuitMeta(item);
                const circuitDays = (item.segments || [])
                  .filter((seg) => seg.segment_type === "circuit_day")
                  .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                const rowKey = getQuoteItemRowKey(item, index);

                return (
                  <React.Fragment key={rowKey}>
                    <tr>
                      <td className="order-cell">
                        <div className="order-controls">
                          <button
                            type="button"
                            className="btn-icon"
                            title="Mover para cima"
                            onClick={() => moveItem(index, "up")}
                            disabled={index === 0 || !isEditing}
                            style={{ padding: "2px 6px" }}
                          >
                            ⬆️
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Mover para baixo"
                            onClick={() => moveItem(index, "down")}
                            disabled={index === items.length - 1 || !isEditing}
                            style={{ padding: "2px 6px" }}
                          >
                            ⬇️
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          className="form-input"
                          list={TIPO_DATALIST_ID}
                          value={item.item_type || ""}
                          onChange={(e) => updateItem(index, { item_type: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Selecione um tipo"
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          value={item.title || ""}
                          onChange={(e) =>
                            updateItem(index, { title: e.target.value, product_name: e.target.value })
                          }
                          disabled={!isEditing}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          list={`quote-item-cidades-${rowKey}`}
                          value={getCidadeInputValue(item, rowKey)}
                          onChange={(e) => handleCidadeInputChange(index, e.target.value, rowKey)}
                          onFocus={() =>
                            scheduleCidadeFetch(rowKey, getCidadeInputValue(item, rowKey))
                          }
                          placeholder="Selecione uma cidade"
                          disabled={!isEditing}
                        />
                      </td>
                      <td>
                          <input
                            className="form-input"
                            value={item.city_name || ""}
                            onChange={(e) => updateItem(index, { city_name: e.target.value })}
                            disabled={!isEditing}
                          />
                      </td>
                      <td>
                          <input
                            className="form-input"
                            type="date"
                            value={item.start_date || ""}
                            onChange={(e) => updateItem(index, { start_date: e.target.value })}
                            disabled={!isEditing}
                          />
                      </td>
                      <td>
                          <input
                            className="form-input"
                            type="date"
                            value={item.end_date || ""}
                            onChange={(e) => updateItem(index, { end_date: e.target.value })}
                            disabled={!isEditing}
                          />
                      </td>
                      <td>
                          <input
                            className="form-input"
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                            disabled={!isEditing}
                          />
                      </td>
                      <td>
                          <input
                            className="form-input"
                            value={formatCurrency(item.total_amount)}
                            onChange={(e) =>
                              updateItem(index, { total_amount: normalizeNumber(e.target.value) })
                            }
                            disabled={!isEditing}
                          />
                      </td>
                      <td>
                          <input
                            className="form-input"
                            value={formatCurrency(Number(item.taxes_amount || 0))}
                            onChange={(e) =>
                              updateItem(index, { taxes_amount: normalizeNumber(e.target.value) })
                            }
                            disabled={!isEditing}
                          />
                      </td>
                    </tr>
                    <datalist id={`quote-item-cidades-${rowKey}`}>
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
                                      disabled={!isEditing}
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label">Serie</label>
                                    <input
                                      className="form-input"
                                      value={circuitMeta.serie || ""}
                                      onChange={(e) => updateCircuitMeta(index, { serie: e.target.value })}
                                      disabled={!isEditing}
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
                                      disabled={!isEditing}
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
                                disabled={!isEditing}
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
                                      key={`circuit-${item.id}-${segIndex}`}
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
                                            disabled={!isEditing}
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
                                            disabled={!isEditing}
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
                                                if (!isEditing || segIndex === 0) return segments;
                                                const next = [...segments];
                                                const [removed] = next.splice(segIndex, 1);
                                                next.splice(segIndex - 1, 0, removed);
                                                return next;
                                              })
                                            }
                                            disabled={!isEditing || segIndex === 0}
                                          >
                                            ⬆️
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-light"
                                            onClick={() =>
                                              updateCircuitSegments(index, (segments) => {
                                                if (!isEditing || segIndex >= segments.length - 1) return segments;
                                                const next = [...segments];
                                                const [removed] = next.splice(segIndex, 1);
                                                next.splice(segIndex + 1, 0, removed);
                                                return next;
                                              })
                                            }
                                            disabled={!isEditing || segIndex >= circuitDays.length - 1}
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
                                            disabled={!isEditing}
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
                                          disabled={!isEditing}
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
                                disabled={!isEditing}
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
        <datalist id={TIPO_DATALIST_ID}>
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
            disabled={saving || !isEditing}
          >
            {saving ? "Salvando..." : "Salvar ajustes"}
          </button>
          {!isEditing && !isFechado && (
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                setIsEditing(true);
                setSuccess(null);
                setError(null);
                setShowSummary(false);
              }}
            >
              Editar orçamento
            </button>
          )}
          {isFechado && (
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Orcamento fechado: edicao bloqueada.
            </span>
          )}
        </div>
        {!canConfirm && (
          <div style={{ marginTop: 4, fontSize: 13 }}>Alguns itens precisam de ajuste.</div>
        )}

        {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>{error}</div>}
        {success && <div style={{ marginTop: 12, color: "#16a34a" }}>{success}</div>}
      </div>
    </div>
  );
}
