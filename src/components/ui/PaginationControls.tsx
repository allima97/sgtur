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

  const rootClass = `pagination-controls ${className || ""}`.trim();

  return (
    <div className={rootClass}>
      <div className="pagination-controls__summary">
        Mostrando {start}-{end} de {totalItems}
      </div>

      <div className="pagination-controls__actions">
        {onPageSizeChange && (
          <label className="pagination-controls__page-size">
            <span className="pagination-controls__page-size-label">Itens por pagina</span>
            <select
              className="form-select pagination-controls__page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="pagination-controls__pager">
          <button
            type="button"
            className="btn btn-light"
            onClick={() => onPageChange(clamp(safePage - 1, 1, totalPages))}
            disabled={safePage <= 1}
          >
            Anterior
          </button>
          <div className="pagination-controls__page-label">
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
