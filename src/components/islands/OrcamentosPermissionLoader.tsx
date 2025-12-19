import React from "react";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type OrcamentosPermissionLoaderProps = {
  children?: React.ReactNode;
};

export default function OrcamentosPermissionLoader({
  children,
}: OrcamentosPermissionLoaderProps) {
  const { ativo, loading } = usePermissao("Vendas");

  if (loading) {
    return <LoadingUsuarioContext className="mb-3" />;
  }

  if (!ativo) {
    return (
      <div className="card-base card-config mb-3">
        <strong>Acesso ao módulo de Vendas bloqueado.</strong>
      </div>
    );
  }

  return <>{children}</>;
}
