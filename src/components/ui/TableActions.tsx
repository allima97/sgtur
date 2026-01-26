import React from "react";

type TableActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  editIcon?: React.ReactNode;
  deleteIcon?: React.ReactNode;
  className?: string;
};

export default function TableActions({
  onEdit,
  onDelete,
  showEdit,
  showDelete,
  editLabel = "Editar",
  deleteLabel = "Excluir",
  editDisabled = false,
  deleteDisabled = false,
  editIcon = "✏️",
  deleteIcon = "🗑️",
  className = "",
}: TableActionsProps) {
  const shouldShowEdit = showEdit ?? Boolean(onEdit);
  const shouldShowDelete = showDelete ?? Boolean(onDelete);

  if (!shouldShowEdit && !shouldShowDelete) return null;

  return (
    <div className={`action-buttons ${className}`.trim()}>
      {shouldShowEdit && onEdit && (
        <button
          type="button"
          className="btn-icon"
          title={editLabel}
          onClick={onEdit}
          disabled={editDisabled}
        >
          {editIcon}
        </button>
      )}
      {shouldShowDelete && onDelete && (
        <button
          type="button"
          className="btn-icon btn-danger"
          title={deleteLabel}
          onClick={onDelete}
          disabled={deleteDisabled}
        >
          {deleteIcon}
        </button>
      )}
    </div>
  );
}
