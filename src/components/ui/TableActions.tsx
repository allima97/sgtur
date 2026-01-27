import React from "react";

type ActionVariant = "danger" | "primary" | "light" | "ghost";

type ActionItem = {
  key: string;
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: ActionVariant;
  disabled?: boolean;
  title?: string;
  className?: string;
};

type TableActionsProps = {
  show?: boolean;
  actions?: ActionItem[];
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
  show = true,
  actions,
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
  if (!show) return null;

  const normalizedActions = (actions || []).filter(Boolean);
  if (normalizedActions.length > 0) {
    return (
      <div className={`action-buttons ${className}`.trim()}>
        {normalizedActions.map((action) => {
          const variantClass =
            action.variant === "danger"
              ? "btn-danger"
              : action.variant === "primary"
                ? "btn-primary"
                : action.variant === "light"
                  ? "btn-light"
                  : action.variant === "ghost"
                    ? "btn-ghost"
                    : "";
          return (
            <button
              key={action.key}
              type="button"
              className={`btn-icon ${variantClass} ${action.className || ""}`.trim()}
              title={action.title || action.label}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon ?? action.label}
            </button>
          );
        })}
      </div>
    );
  }

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
