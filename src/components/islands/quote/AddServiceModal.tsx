import React, { useMemo, useState } from "react";
import ModalShell from "./ModalShell";
import { supabaseBrowser } from "../../../lib/supabase-browser";

type Fornecedor = { id: string; nome_completo: string; nome_fantasia?: string | null };
type ServicoFornecedor = { id: string; fornecedor_id: string; nome: string; tipo: string; descricao?: string | null; ativo: boolean };

export default function AddServiceModal(props: {
  quoteId: string;
  currency: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const [itemType, setItemType] = useState<"TRANSFER" | "TOUR" | "INSURANCE">("TRANSFER");
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [servicos, setServicos] = useState<ServicoFornecedor[]>([]);

  const [fornecedorId, setFornecedorId] = useState("");
  const [servicoFornecedorId, setServicoFornecedorId] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [details, setDetails] = useState("");

  const [preview, setPreview] = useState<any>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const canPreview = useMemo(() => fornecedorId && servicoFornecedorId && quantity > 0, [fornecedorId, servicoFornecedorId, quantity]);

  async function loadFornecedores() {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("fornecedores")
        .select("id, nome_completo, nome_fantasia")
        .order("nome_completo", { ascending: true });
      if (error) throw error;
      setFornecedores((data ?? []) as any);
    } finally {
      setLoading(false);
    }
  }

  async function loadServicosFornecedor(fId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("servicos_fornecedor")
        .select("id, fornecedor_id, nome, tipo, descricao, ativo")
        .eq("fornecedor_id", fId)
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      setServicos((data ?? []) as any);
    } finally {
      setLoading(false);
    }
  }

  async function runPreview() {
    if (!canPreview) return;
    setPreview(null);
    setPreviewError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/quote/service-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          item_type: itemType,
          fornecedor_id: fornecedorId,
          servico_fornecedor_id: servicoFornecedorId,
          quantity,
          data_inicio: dataInicio || null,
          data_fim: dataFim || null,
          currency: props.currency,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha no preview");
      setPreview(json);
    } catch (e: any) {
      setPreviewError(e.message || "Erro no preview");
    } finally {
      setLoading(false);
    }
  }

  async function addToCart() {
    if (!preview) return;
    setLoading(true);
    try {
      const fornecedor = fornecedores.find((f) => f.id === fornecedorId);
      const serv = servicos.find((s) => s.id === servicoFornecedorId);

      const supplier_snapshot = fornecedor ? (fornecedor.nome_fantasia || fornecedor.nome_completo) : null;

      const description_snapshot =
        preview.description_snapshot ||
        `${itemType} — ${serv?.nome ?? "Serviço"} — Qtd ${quantity}` +
          (dataInicio ? ` — ${dataInicio}` : "") +
          (dataFim ? ` a ${dataFim}` : "") +
          (details ? ` — ${details}` : "");

      // product_id: neste estágio, podemos usar um produto "genérico" (se existir),
      // OU criar um mapeamento servico_fornecedor -> product_id no futuro.
      // Para não travar agora, vamos gravar product_id = servico_fornecedor_id (se seu campo aceitar apenas uuid) — ele aceita uuid.
      // Isso preserva unicidade e permite conversão futura.
      const product_id = servicoFornecedorId;

      const resolvedType = itemType === "INSURANCE" ? "TRANSFER" : itemType;
      const descriptionWithTipo = description_snapshot.startsWith("Tipo:")
        ? description_snapshot
        : `Tipo: ${itemType} — ${description_snapshot}`;
      const payload: any = {
        quote_id: props.quoteId,
        product_id,
        item_type: resolvedType,
        quantity: preview.quantity ?? quantity,
        description_snapshot: descriptionWithTipo,
        unit_price_snapshot: preview.unit_price_snapshot ?? 0,
        taxes_snapshot: preview.taxes_snapshot ?? 0,
        total_item: preview.total_item ?? 0,
        supplier_snapshot,
        policy_snapshot: preview.policy_snapshot ?? null,
        commission_type: preview.commission_type ?? null,
        commission_value: preview.commission_value ?? null,
        commission_amount_snapshot: preview.commission_amount_snapshot ?? 0,
      };

      const { error } = await supabaseBrowser.from("quote_item").insert(payload);
      if (error) throw error;

      props.onAdded();
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadFornecedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalShell title="Adicionar Serviço" onClose={props.onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={itemType} onChange={(e) => setItemType(e.target.value as any)}>
              <option value="TRANSFER">Transfer</option>
              <option value="TOUR">Passeio</option>
              <option value="INSURANCE">Seguro</option>
            </select>
          </div>

          <div>
            <label className="label">Fornecedor</label>
            <select
              className="input"
              value={fornecedorId}
              onChange={async (e) => {
                const v = e.target.value;
                setFornecedorId(v);
                setServicoFornecedorId("");
                setPreview(null);
                if (v) await loadServicosFornecedor(v);
              }}
            >
              <option value="">Selecione...</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome_fantasia || f.nome_completo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Serviço</label>
            <select
              className="input"
              value={servicoFornecedorId}
              onChange={(e) => {
                setServicoFornecedorId(e.target.value);
                setPreview(null);
              }}
              disabled={!fornecedorId}
            >
              <option value="">Selecione...</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} ({s.tipo})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <label className="label">Quantidade</label>
            <input className="input" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Data início</label>
            <input className="input" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input className="input" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div>
            <label className="label">Detalhes</label>
            <input className="input" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ex: 18:30, GIG → Hotel..." />
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn-secondary" onClick={runPreview} disabled={!canPreview || loading}>
            Preview
          </button>
          <button className="btn-primary" onClick={addToCart} disabled={!preview || loading}>
            Adicionar ao carrinho
          </button>
        </div>

        {previewError && <div className="card-error">{previewError}</div>}

        {preview && (
          <div className="card-subtle">
            <div className="font-semibold">Preview</div>
            <div className="text-sm mt-2">{preview.description_snapshot}</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-muted">Qtd</div>
                <div className="font-bold">{preview.quantity ?? quantity}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Unit</div>
                <div className="font-bold">
                  {Number(preview.unit_price_snapshot || 0).toLocaleString("pt-BR", { style: "currency", currency: props.currency })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Total</div>
                <div className="font-bold">
                  {Number(preview.total_item || 0).toLocaleString("pt-BR", { style: "currency", currency: props.currency })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
