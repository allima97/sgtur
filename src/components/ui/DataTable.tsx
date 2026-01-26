import React from "react";

type DataTableProps = {
  className?: string;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  headers: React.ReactNode;
  children?: React.ReactNode;
  loading?: boolean;
  loadingMessage?: React.ReactNode;
  empty?: boolean;
  emptyMessage?: React.ReactNode;
  colSpan: number;
};

export default function DataTable({
  className,
  containerClassName,
  containerStyle,
  headers,
  children,
  loading = false,
  loadingMessage = "Carregando...",
  empty = false,
  emptyMessage = "Nenhum registro encontrado.",
  colSpan,
}: DataTableProps) {
  const showLoading = loading;
  const showEmpty = !loading && empty;
  const showRows = !loading && !empty;

  return (
    <div
      className={`table-container overflow-x-auto ${containerClassName || ""}`.trim()}
      style={containerStyle}
    >
      <table className={className}>
        <thead>{headers}</thead>
        <tbody>
          {showLoading && (
            <tr>
              <td colSpan={colSpan} className="table-loading-cell">
                {loadingMessage}
              </td>
            </tr>
          )}
          {showEmpty && (
            <tr>
              <td colSpan={colSpan} className="table-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          )}
          {showRows && children}
        </tbody>
      </table>
    </div>
  );
}
