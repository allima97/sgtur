import React, { useMemo, useState } from "react";
import ModalShell from "./ModalShell";
import { supabaseBrowser } from "../../../lib/supabase-browser";

type Hotel = { id: string; product_id: string; ativo: boolean };
type HotelRoomType = { id: string; hotel_id: string; nome: string; ativo: boolean };
type RatePlan = { id: string; room_type_id: string; codigo: string; regime: string; reembolsavel: boolean; ativo: boolean };

export default function AddHotelModal(props: {
  quoteId: string;
  currency: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [roomTypes, setRoomTypes] = useState<HotelRoomType[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);

  const [hotelId, setHotelId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [ratePlanId, setRatePlanId] = useState("");

  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  const [preview, setPreview] = useState<any>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const canPreview = useMemo(
    () => hotelId && roomTypeId && ratePlanId && checkin && checkout && rooms > 0,
    [hotelId, roomTypeId, ratePlanId, checkin, checkout, rooms]
  );

  async function loadHotels() {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("hotel")
        .select("id, product_id, ativo")
        .eq("ativo", true);
      if (error) throw error;
      setHotels((data ?? []) as any);
    } finally {
      setLoading(false);
    }
  }

  async function loadRoomTypes(hId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("hotel_room_type")
        .select("id, hotel_id, nome, ativo")
        .eq("hotel_id", hId)
        .eq("ativo", true);
      if (error) throw error;
      setRoomTypes((data ?? []) as any);
    } finally {
      setLoading(false);
    }
  }

  async function loadRatePlans(rtId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("rate_plan")
        .select("id, room_type_id, codigo, regime, reembolsavel, ativo")
        .eq("room_type_id", rtId)
        .eq("ativo", true);
      if (error) throw error;
      setRatePlans((data ?? []) as any);
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
      const res = await fetch("/api/quote/hotel-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hotel_id: hotelId,
          room_type_id: roomTypeId,
          rate_plan_id: ratePlanId,
          checkin,
          checkout,
          adults,
          children,
          rooms,
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
      // pega product_id do hotel para gravar no quote_item
      const hotel = hotels.find((h) => h.id === hotelId);
      if (!hotel?.product_id) throw new Error("Hotel sem product_id");

      const description_snapshot = preview.description_snapshot;
      const policy_snapshot = preview.policy_text || null;
      const supplier_snapshot = preview.supplier_snapshot || null;

      const payload: any = {
        quote_id: props.quoteId,
        product_id: hotel.product_id,
        item_type: "HOTEL",
        quantity: preview.quantity,
        description_snapshot,
        unit_price_snapshot: preview.unit_price_snapshot,
        taxes_snapshot: preview.taxes_snapshot,
        total_item: preview.total_item,
        supplier_snapshot,
        policy_snapshot,
        commission_type: preview.commission_type ?? null,
        commission_value: preview.commission_value ?? null,
        commission_amount_snapshot: preview.commission_amount_snapshot ?? 0,
        markup_type: preview.markup_type ?? null,
        markup_value: preview.markup_value ?? null,
        markup_amount_snapshot: preview.markup_amount_snapshot ?? 0,
        net_unit_snapshot: preview.net_unit_snapshot ?? null,
      };

      const { error } = await supabaseBrowser.from("quote_item").insert(payload);
      if (error) throw error;

      props.onAdded();
    } finally {
      setLoading(false);
    }
  }

  // carrega hotéis ao abrir
  React.useEffect(() => {
    loadHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalShell title="Adicionar Hotel" onClose={props.onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="label">Hotel</label>
            <select
              className="input"
              value={hotelId}
              onChange={async (e) => {
                const v = e.target.value;
                setHotelId(v);
                setRoomTypeId("");
                setRatePlanId("");
                setPreview(null);
                if (v) await loadRoomTypes(v);
              }}
            >
              <option value="">Selecione...</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.id.slice(0, 8)}...
                </option>
              ))}
            </select>
            <div className="text-xs text-muted mt-1">
              (Sugestão: você pode trocar esse label para nome do hotel via join com produtos)
            </div>
          </div>

          <div>
            <label className="label">Tipo de quarto</label>
            <select
              className="input"
              value={roomTypeId}
              onChange={async (e) => {
                const v = e.target.value;
                setRoomTypeId(v);
                setRatePlanId("");
                setPreview(null);
                if (v) await loadRatePlans(v);
              }}
              disabled={!hotelId}
            >
              <option value="">Selecione...</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Rate plan</label>
            <select
              className="input"
              value={ratePlanId}
              onChange={(e) => {
                setRatePlanId(e.target.value);
                setPreview(null);
              }}
              disabled={!roomTypeId}
            >
              <option value="">Selecione...</option>
              {ratePlans.map((rp) => (
                <option key={rp.id} value={rp.id}>
                  {rp.codigo} — {rp.regime} — {rp.reembolsavel ? "Reembolsável" : "Não reembolsável"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div>
            <label className="label">Check-in</label>
            <input className="input" type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input className="input" type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
          </div>
          <div>
            <label className="label">Adultos</label>
            <input className="input" type="number" min={1} value={adults} onChange={(e) => setAdults(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Crianças</label>
            <input className="input" type="number" min={0} value={children} onChange={(e) => setChildren(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Quartos</label>
            <input className="input" type="number" min={1} value={rooms} onChange={(e) => setRooms(Number(e.target.value))} />
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
            <div className="text-sm text-muted mt-1">{preview.policy_text}</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-muted">Qtd</div>
                <div className="font-bold">{preview.quantity}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Taxas</div>
                <div className="font-bold">
                  {Number(preview.taxes_snapshot || 0).toLocaleString("pt-BR", { style: "currency", currency: props.currency })}
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
