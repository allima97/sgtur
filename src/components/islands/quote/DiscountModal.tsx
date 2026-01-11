import React, { useState } from "react";
import ModalShell from "./ModalShell";
import { supabaseBrowser } from "../../../lib/supabase-browser";

export default function DiscountModal(props: {
  quoteId: string;
  currency: string;
  appliedBy: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [value, setValue] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setErr(null);
    try {
      const { error } = await supabaseBrowser.from("quote_discount").insert({
        quote_id: props.quoteId,
        applied_by: props.appliedBy,
        discount_type: discountType,
        value,
        reason: reason || null,
      });
      if (error) throw error;
      props.onSaved();
    } catch (e: any) {
      setErr(e.message || "Erro ao aplicar desconto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Aplicar desconto" onClose={props.onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
              <option value="FIXED">Valor fixo</option>
              <option value="PERCENT">Percentual</option>
            </select>
          </div>
          <div>
            <label className="label">{discountType === "FIXED" ? "Valor" : "Percentual (%)"}</label>
            <input className="input" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Motivo</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>

        {err && <div className="card-error">{err}</div>}

        <div className="flex gap-2">
          <button className="btn-light" onClick={props.onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={save} disabled={loading}>
            Salvar desconto
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
