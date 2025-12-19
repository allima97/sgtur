import React from "react";

type LoadingUsuarioContextProps = {
  className?: string;
};

export default function LoadingUsuarioContext({ className = "" }: LoadingUsuarioContextProps) {
  const classes = ["card-base", "card-config", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <strong>Carregando contexto do usuário...</strong>
    </div>
  );
}
