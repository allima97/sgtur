import { MAPA_MODULOS } from "../config/modulos";

const ADMIN_MODULES = [
  "Admin",
  "AdminDashboard",
  "AdminLogs",
  "AdminUsers",
  "AdminEmpresas",
  "AdminFinanceiro",
  "AdminPlanos",
];

const ADMIN_MODULE_KEYS = new Set(
  ADMIN_MODULES.flatMap((modulo) => {
    const mapped = MAPA_MODULOS[modulo];
    return [modulo, mapped ?? modulo];
  }).map((value) => value.toLowerCase())
);

export function isAdminModuleKey(modulo?: string | null) {
  if (!modulo) return false;
  return ADMIN_MODULE_KEYS.has(String(modulo).toLowerCase());
}

export function extractUserTypeName(data: any): string {
  const raw = Array.isArray(data?.user_types)
    ? data.user_types[0]?.name
    : data?.user_types?.name;

  return typeof raw === "string" ? raw : "";
}

export function isSystemAdminRole(role?: string | null) {
  return String(role || "").trim().toUpperCase().includes("ADMIN");
}

export function normalizeUserType(role?: string | null) {
  return String(role || "").trim().toUpperCase();
}
