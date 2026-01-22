globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as renderers } from './chunks/_@astro-renderers_MjSq-9QN.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_B8iUYFJE.mjs';
import { manifest } from './manifest_SgMgb5Ae.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/admin/permissoes.astro.mjs');
const _page2 = () => import('./pages/admin/sales/_id_/payments.astro.mjs');
const _page3 = () => import('./pages/admin/sales/_id_/pdf.astro.mjs');
const _page4 = () => import('./pages/admin/sales/_id_/refunds.astro.mjs');
const _page5 = () => import('./pages/api/cron-alerta-comissao.astro.mjs');
const _page6 = () => import('./pages/api/importar-vendas.astro.mjs');
const _page7 = () => import('./pages/auth/login.astro.mjs');
const _page8 = () => import('./pages/auth/recover.astro.mjs');
const _page9 = () => import('./pages/auth/register.astro.mjs');
const _page10 = () => import('./pages/auth/reset.astro.mjs');
const _page11 = () => import('./pages/cadastros/cidades.astro.mjs');
const _page12 = () => import('./pages/cadastros/circuitos.astro.mjs');
const _page13 = () => import('./pages/cadastros/destinos.astro.mjs');
const _page14 = () => import('./pages/cadastros/estados.astro.mjs');
const _page15 = () => import('./pages/cadastros/fornecedores.astro.mjs');
const _page16 = () => import('./pages/cadastros/lote.astro.mjs');
const _page17 = () => import('./pages/cadastros/paises.astro.mjs');
const _page18 = () => import('./pages/cadastros/produtos.astro.mjs');
const _page19 = () => import('./pages/clientes/cadastro.astro.mjs');
const _page20 = () => import('./pages/clientes/carteira.astro.mjs');
const _page21 = () => import('./pages/comissoes/fechamento.astro.mjs');
const _page22 = () => import('./pages/dashboard/admin.astro.mjs');
const _page23 = () => import('./pages/dashboard/financeiro.astro.mjs');
const _page24 = () => import('./pages/dashboard/gestor.astro.mjs');
const _page25 = () => import('./pages/dashboard/logs.astro.mjs');
const _page26 = () => import('./pages/dashboard/permissoes.astro.mjs');
const _page27 = () => import('./pages/dashboard.astro.mjs');
const _page28 = () => import('./pages/documentacao.astro.mjs');
const _page29 = () => import('./pages/gestor/importar-vendas.astro.mjs');
const _page30 = () => import('./pages/metas/vendedor.astro.mjs');
const _page31 = () => import('./pages/negado.astro.mjs');
const _page32 = () => import('./pages/operacao/comissionamento.astro.mjs');
const _page33 = () => import('./pages/operacao/viagens/_id_.astro.mjs');
const _page34 = () => import('./pages/operacao/viagens.astro.mjs');
const _page35 = () => import('./pages/orcamentos/consulta.astro.mjs');
const _page36 = () => import('./pages/orcamentos/criar.astro.mjs');
const _page37 = () => import('./pages/orcamentos/importar.astro.mjs');
const _page38 = () => import('./pages/orcamentos/_id_.astro.mjs');
const _page39 = () => import('./pages/orcamentos.astro.mjs');
const _page40 = () => import('./pages/parametros/cambios.astro.mjs');
const _page41 = () => import('./pages/parametros/comissoes/templates.astro.mjs');
const _page42 = () => import('./pages/parametros/metas.astro.mjs');
const _page43 = () => import('./pages/parametros/orcamentos.astro.mjs');
const _page44 = () => import('./pages/parametros/regras-comissao.astro.mjs');
const _page45 = () => import('./pages/parametros/tipo-produtos.astro.mjs');
const _page46 = () => import('./pages/parametros.astro.mjs');
const _page47 = () => import('./pages/perfil.astro.mjs');
const _page48 = () => import('./pages/relatorios/vendas.astro.mjs');
const _page49 = () => import('./pages/relatorios/vendas-por-cliente.astro.mjs');
const _page50 = () => import('./pages/relatorios/vendas-por-destino.astro.mjs');
const _page51 = () => import('./pages/relatorios/vendas-por-produto.astro.mjs');
const _page52 = () => import('./pages/test-env.astro.mjs');
const _page53 = () => import('./pages/vendas/cadastro.astro.mjs');
const _page54 = () => import('./pages/vendas/consulta.astro.mjs');
const _page55 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/admin/permissoes.astro", _page1],
    ["src/pages/admin/sales/[id]/payments.astro", _page2],
    ["src/pages/admin/sales/[id]/pdf.astro", _page3],
    ["src/pages/admin/sales/[id]/refunds.astro", _page4],
    ["src/pages/api/cron-alerta-comissao.ts", _page5],
    ["src/pages/api/importar-vendas.ts", _page6],
    ["src/pages/auth/login.astro", _page7],
    ["src/pages/auth/recover.astro", _page8],
    ["src/pages/auth/register.astro", _page9],
    ["src/pages/auth/reset.astro", _page10],
    ["src/pages/cadastros/cidades.astro", _page11],
    ["src/pages/cadastros/circuitos.astro", _page12],
    ["src/pages/cadastros/destinos.astro", _page13],
    ["src/pages/cadastros/estados.astro", _page14],
    ["src/pages/cadastros/fornecedores.astro", _page15],
    ["src/pages/cadastros/lote.astro", _page16],
    ["src/pages/cadastros/paises.astro", _page17],
    ["src/pages/cadastros/produtos.astro", _page18],
    ["src/pages/clientes/cadastro.astro", _page19],
    ["src/pages/clientes/carteira.astro", _page20],
    ["src/pages/comissoes/fechamento.astro", _page21],
    ["src/pages/dashboard/admin.astro", _page22],
    ["src/pages/dashboard/financeiro.astro", _page23],
    ["src/pages/dashboard/gestor.astro", _page24],
    ["src/pages/dashboard/logs.astro", _page25],
    ["src/pages/dashboard/permissoes.astro", _page26],
    ["src/pages/dashboard/index.astro", _page27],
    ["src/pages/documentacao/index.astro", _page28],
    ["src/pages/gestor/importar-vendas.astro", _page29],
    ["src/pages/metas/vendedor.astro", _page30],
    ["src/pages/negado.astro", _page31],
    ["src/pages/operacao/comissionamento.astro", _page32],
    ["src/pages/operacao/viagens/[id].astro", _page33],
    ["src/pages/operacao/viagens/index.astro", _page34],
    ["src/pages/orcamentos/consulta.astro", _page35],
    ["src/pages/orcamentos/criar.astro", _page36],
    ["src/pages/orcamentos/importar.astro", _page37],
    ["src/pages/orcamentos/[id].astro", _page38],
    ["src/pages/orcamentos/index.astro", _page39],
    ["src/pages/parametros/cambios.astro", _page40],
    ["src/pages/parametros/comissoes/templates.astro", _page41],
    ["src/pages/parametros/metas.astro", _page42],
    ["src/pages/parametros/orcamentos.astro", _page43],
    ["src/pages/parametros/regras-comissao.astro", _page44],
    ["src/pages/parametros/tipo-produtos.astro", _page45],
    ["src/pages/parametros/index.astro", _page46],
    ["src/pages/perfil/index.astro", _page47],
    ["src/pages/relatorios/vendas.astro", _page48],
    ["src/pages/relatorios/vendas-por-cliente.astro", _page49],
    ["src/pages/relatorios/vendas-por-destino.astro", _page50],
    ["src/pages/relatorios/vendas-por-produto.astro", _page51],
    ["src/pages/test-env.astro", _page52],
    ["src/pages/vendas/cadastro.astro", _page53],
    ["src/pages/vendas/consulta.astro", _page54],
    ["src/pages/index.astro", _page55]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = undefined;
const _exports = createExports(_manifest);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
