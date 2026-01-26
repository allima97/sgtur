import React from "react";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  if (!title && !description && !icon && !action) return null;

  return (
    <div className={`empty-state ${className || ""}`.trim()}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      {title && <div className="empty-state-title">{title}</div>}
      {description && <div className="empty-state-description">{description}</div>}
      {action && <div className="empty-state-actions">{action}</div>}
    </div>
  );
}
