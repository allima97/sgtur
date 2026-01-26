import React from "react";

type SearchInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  helpText?: string;
  wrapperClassName?: string;
  inputClassName?: string;
};

export default function SearchInput({
  label,
  value,
  onChange,
  placeholder = "Buscar...",
  name,
  disabled = false,
  helpText,
  wrapperClassName,
  inputClassName,
}: SearchInputProps) {
  return (
    <div className={`form-group ${wrapperClassName || ""}`.trim()}>
      {label && <label className="form-label">{label}</label>}
      <input
        className={`form-input ${inputClassName || ""}`.trim()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        name={name}
        disabled={disabled}
      />
      {helpText && <small style={{ color: "#64748b" }}>{helpText}</small>}
    </div>
  );
}
