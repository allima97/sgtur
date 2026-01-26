import React from "react";

type TableAction = {
  key: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  icon?: React.ReactNode;
};

type TableActionsProps = {
  actions: TableAction[];
  className?: string;
  show?: boolean;
};

export default function TableActions({ actions, className, show = true }: TableActionsProps) {
  if (!show) return null;

  return (
    <div className={`action-buttons ${className || ""}`.trim()}>
      {actions.map((action) => (
        <button
          key={action.key}
          className={`btn-icon${action.variant === "danger" ? " btn-danger" : ""}`}
          title={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.icon ?? action.label}
        </button>
      ))}
    </div>
  );
}
