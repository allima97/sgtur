import React from "react";

export type FlightLeg = {
  departure_time?: string;
  departure_code?: string;
  departure_city?: string;
  arrival_time?: string;
  arrival_code?: string;
  arrival_city?: string;
  duration?: string;
  flight_number?: string;
  flight_type?: string;
};

export type FlightDirection = {
  label: string;
  route?: string;
  date?: string;
  legs: FlightLeg[];
  notices?: string[];
};

export type FlightDetails = {
  route?: string;
  airline?: string;
  cabin?: string;
  fare_tags?: string[];
  directions?: FlightDirection[];
  baggage?: string[];
  notices?: string[];
  hotel_lines?: string[];
};

type FlightDetailsModalProps = {
  details: FlightDetails;
  title?: string;
  onClose: () => void;
};

function buildLegMeta(leg: FlightLeg) {
  return [leg.flight_type, leg.flight_number, leg.duration].filter(Boolean).join(" | ");
}

function buildLegLine(time?: string, code?: string, city?: string) {
  const parts = [time, code, city].filter(Boolean);
  return parts.join(" ");
}

function normalizeList(values?: string[]) {
  return (values || []).map((value) => (value || "").trim()).filter(Boolean);
}

export default function FlightDetailsModal({ details, title, onClose }: FlightDetailsModalProps) {
  const fareTags = normalizeList(details.fare_tags);
  const baggageLines = normalizeList(details.baggage);
  const notices = normalizeList(details.notices);
  const hotelLines = normalizeList(details.hotel_lines);
  const directions = (details.directions || []).filter((dir) => dir && (dir.legs?.length || dir.route || dir.date));

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: 920, width: "95vw" }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{title || "Detalhes do voo"}</div>
            {details.route && (
              <div style={{ fontSize: "0.9rem", color: "#475569" }}>{details.route}</div>
            )}
          </div>
          <button className="btn-ghost" onClick={onClose}>
            ✖
          </button>
        </div>
        <div className="modal-body" style={{ display: "grid", gap: 12 }}>
          {(details.airline || details.cabin) && (
            <div style={{ fontSize: 14 }}>
              {[details.airline, details.cabin].filter(Boolean).join(" | ")}
            </div>
          )}
          {fareTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {fareTags.map((tag, idx) => (
                <span
                  key={`fare-${idx}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    background: "#f8fafc",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {notices.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {notices.map((note, idx) => (
                <div
                  key={`notice-${idx}`}
                  style={{
                    border: "1px solid #fde68a",
                    background: "#fef9c3",
                    color: "#92400e",
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  {note}
                </div>
              ))}
            </div>
          )}

          {directions.length > 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              {directions.map((dir, idx) => (
                <div
                  key={`dir-${idx}`}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {[dir.label, dir.route].filter(Boolean).join(" - ")}
                  </div>
                  {dir.date && (
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{dir.date}</div>
                  )}
                  {(dir.legs || []).map((leg, legIdx) => (
                    <div key={`leg-${idx}-${legIdx}`} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {buildLegLine(leg.departure_time, leg.departure_code, leg.departure_city)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {buildLegLine(leg.arrival_time, leg.arrival_code, leg.arrival_city)}
                      </div>
                      {buildLegMeta(leg) && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>{buildLegMeta(leg)}</div>
                      )}
                    </div>
                  ))}
                  {(dir.notices || []).length > 0 && (
                    <div style={{ display: "grid", gap: 6 }}>
                      {dir.notices?.map((note, noteIdx) => (
                        <div
                          key={`dir-note-${idx}-${noteIdx}`}
                          style={{
                            border: "1px solid #fde68a",
                            background: "#fef9c3",
                            color: "#92400e",
                            padding: "6px 8px",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {baggageLines.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Bagagens</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {baggageLines.map((line, idx) => (
                  <li key={`bag-${idx}`} style={{ fontSize: 13, color: "#475569" }}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hotelLines.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Hotel</div>
              <div style={{ display: "grid", gap: 4 }}>
                {hotelLines.map((line, idx) => (
                  <div
                    key={`hotel-${idx}`}
                    style={{ fontSize: 13, color: idx === 0 ? "#0f172a" : "#475569" }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
