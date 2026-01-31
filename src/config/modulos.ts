export const MAPA_MODULOS: Record<string, string> = {
  Dashboard: "dashboard",
  Vendas: "vendas_consulta",
  Orcamentos: "orcamentos",
  Clientes: "clientes",

  Cadastros: "cadastros",
  Paises: "cadastros_paises",
  Subdivisoes: "cadastros_estados",
  Cidades: "cadastros_cidades",
  Destinos: "cadastros_destinos",
  Produtos: "cadastros_produtos",
  Circuitos: "cadastros_produtos",
  ProdutosLote: "cadastros_produtos",
  Fornecedores: "cadastros_fornecedores",

  Relatorios: "relatorios",
  RelatorioVendas: "relatorios_vendas",
  RelatorioDestinos: "relatorios_destinos",
  RelatorioProdutos: "relatorios_produtos",
  RelatorioClientes: "relatorios_clientes",

  Parametros: "parametros",
  TipoProdutos: "parametros_tipo_produtos",
  Metas: "parametros_metas",
  RegrasComissao: "parametros_regras_comissao",

  Admin: "admin",
  AdminDashboard: "admin_dashboard",
  AdminUsers: "admin_users",
  AdminLogs: "admin_logs",
  AdminEmpresas: "admin_empresas",
  AdminFinanceiro: "admin_financeiro",
  AdminPlanos: "admin_planos",

  Operacao: "operacao",
  Viagens: "operacao_viagens",
  Comissionamento: "comissionamento",
};

export const MODULO_ALIASES: Record<string, string> = Object.keys(MAPA_MODULOS).reduce(
  (acc, key) => {
    acc[key.toLowerCase()] = MAPA_MODULOS[key];
    return acc;
  },
  {} as Record<string, string>,
);

export const ROTAS_MODULOS: Record<string, string> = {
  "/dashboard/logs": "Admin",
  "/dashboard/admin": "Admin",
  "/dashboard/permissoes": "Admin",
  "/admin/permissoes": "Admin",
  "/admin/empresas": "AdminEmpresas",
  "/admin/usuarios": "AdminUsers",
  "/admin/financeiro": "AdminFinanceiro",
  "/admin/planos": "AdminPlanos",
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/vendas": "Vendas",
  "/orcamentos": "Vendas",
  "/clientes": "Clientes",
  "/cadastros": "Cadastros",
  "/relatorios": "Relatorios",
  "/parametros": "Parametros",
  "/admin": "Admin",
  "/documentacao": "Admin",
};

export function descobrirModulo(pathname: string): string | null {
  if (pathname === "/") return ROTAS_MODULOS["/"] ?? null;

  const entradas = Object.keys(ROTAS_MODULOS)
    .filter((rota) => rota !== "/")
    .sort((a, b) => b.length - a.length);

  for (const rota of entradas) {
    if (pathname.startsWith(rota)) return ROTAS_MODULOS[rota];
  }
  return null;
}
