import React from "react";

type AlertVariant = "success" | "error" | "warning" | "info";

type AlertMessageProps = {
  variant?: AlertVariant;
  className?: string;
  children: React.ReactNode;
};

const variantClass: Record<AlertVariant, string> = {
  success: "auth-success",
  error: "auth-error",
  warning: "card-base card-config",
  info: "card-base card-config",
};

export default function AlertMessage({
  variant = "info",
  className = "",
  children,
}: AlertMessageProps) {
  if (!children) return null;
  const baseClass = variantClass[variant] || variantClass.info;
  return <div className={`${baseClass} ${className}`.trim()}>{children}</div>;
}
