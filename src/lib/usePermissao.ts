export type Permissao =
  | "none"
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "admin";

export interface PermissaoModulo {
  modulo: string;
  permissao: Permissao;
}

/**
 * Converte permissão textual em nível numérico
 * DEVE refletir exatamente a função SQL perm_level()
 */
const permLevel = (p: Permissao | undefined): number => {
  switch (p) {
    case "admin":
      return 5;
    case "delete":
      return 4;
    case "edit":
      return 3;
    case "create":
      return 2;
    case "view":
      return 1;
    default:
      return 0;
  }
};

export function usePermissao(
  permissoes: PermissaoModulo[] | null | undefined,
  modulo: string
) {
  const atual: Permissao =
    permissoes?.find(p => p.modulo === modulo)?.permissao ?? "none";

  const nivel = permLevel(atual);

  return {
    nivel,

    canView: nivel >= permLevel("view"),
    canCreate: nivel >= permLevel("create"),
    canEdit: nivel >= permLevel("edit"),
    canDelete: nivel >= permLevel("delete"),
    isAdmin: atual === "admin",

    has: (min: Permissao) => nivel >= permLevel(min),
  };
}