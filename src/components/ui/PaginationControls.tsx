import React, { useMemo } from "react";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function PaginationControls({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationControlsProps) {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / Math.max(pageSize, 1))),
    [totalItems, pageSize]
  );

  const safePage = clamp(page, 1, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
        Mostrando {start}-{end} de {totalItems}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {onPageSizeChange && (
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Itens por pagina</span>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{ minWidth: 90 }}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => onPageChange(clamp(safePage - 1, 1, totalPages))}
            disabled={safePage <= 1}
          >
            Anterior
          </button>
          <div style={{ alignSelf: "center", color: "#64748b", fontSize: "0.9rem" }}>
            Pagina {safePage} de {totalPages}
          </div>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => onPageChange(clamp(safePage + 1, 1, totalPages))}
            disabled={safePage >= totalPages}
          >
            Proxima
          </button>
        </div>
      </div>
    </div>
  );
}
