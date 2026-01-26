import { useEffect } from "react";
import { refreshPermissoes } from "../../lib/permissoesStore";

export default function PermissoesProvider() {
  useEffect(() => {
    refreshPermissoes();
  }, []);

  return null;
}
