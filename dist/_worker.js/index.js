globalThis.process ??= {}; globalThis.process.env ??= {};
import { a as renderers } from './chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { createExports } from './_@astrojs-ssr-adapter.mjs';
import { manifest } from './manifest_qScrqCCH.mjs';

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/admin/permissoes.astro.mjs');
const _page2 = () => import('./pages/auth/login.astro.mjs');
const _page3 = () => import('./pages/auth/recover.astro.mjs');
const _page4 = () => import('./pages/auth/register.astro.mjs');
const _page5 = () => import('./pages/auth/reset.astro.mjs');
const _page6 = () => import('./pages/cadastros/cidades.astro.mjs');
const _page7 = () => import('./pages/cadastros/destinos.astro.mjs');
const _page8 = () => import('./pages/cadastros/estados.astro.mjs');
const _page9 = () => import('./pages/cadastros/paises.astro.mjs');
const _page10 = () => import('./pages/cadastros/produtos.astro.mjs');
const _page11 = () => import('./pages/clientes/carteira.astro.mjs');
const _page12 = () => import('./pages/comissoes/fechamento.astro.mjs');
const _page13 = () => import('./pages/dashboard/admin.astro.mjs');
const _page14 = () => import('./pages/dashboard/gestor.astro.mjs');
const _page15 = () => import('./pages/dashboard/logs.astro.mjs');
const _page16 = () => import('./pages/dashboard/permissoes.astro.mjs');
const _page17 = () => import('./pages/dashboard.astro.mjs');
const _page18 = () => import('./pages/documentacao.astro.mjs');
const _page19 = () => import('./pages/metas/vendedor.astro.mjs');
const _page20 = () => import('./pages/negado.astro.mjs');
const _page21 = () => import('./pages/operacao/comissionamento.astro.mjs');
const _page22 = () => import('./pages/orcamentos.astro.mjs');
const _page23 = () => import('./pages/parametros/comissoes/templates.astro.mjs');
const _page24 = () => import('./pages/parametros/metas.astro.mjs');
const _page25 = () => import('./pages/parametros/regras-comissao.astro.mjs');
const _page26 = () => import('./pages/parametros/tipo-produtos.astro.mjs');
const _page27 = () => import('./pages/parametros.astro.mjs');
const _page28 = () => import('./pages/perfil.astro.mjs');
const _page29 = () => import('./pages/relatorios/vendas.astro.mjs');
const _page30 = () => import('./pages/relatorios/vendas-por-cliente.astro.mjs');
const _page31 = () => import('./pages/relatorios/vendas-por-destino.astro.mjs');
const _page32 = () => import('./pages/relatorios/vendas-por-produto.astro.mjs');
const _page33 = () => import('./pages/test-env.astro.mjs');
const _page34 = () => import('./pages/vendas/cadastro.astro.mjs');
const _page35 = () => import('./pages/vendas/consulta.astro.mjs');
const _page36 = () => import('./pages/index.astro.mjs');

const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/admin/permissoes.astro", _page1],
    ["src/pages/auth/login.astro", _page2],
    ["src/pages/auth/recover.astro", _page3],
    ["src/pages/auth/register.astro", _page4],
    ["src/pages/auth/reset.astro", _page5],
    ["src/pages/cadastros/cidades.astro", _page6],
    ["src/pages/cadastros/destinos.astro", _page7],
    ["src/pages/cadastros/estados.astro", _page8],
    ["src/pages/cadastros/paises.astro", _page9],
    ["src/pages/cadastros/produtos.astro", _page10],
    ["src/pages/clientes/carteira.astro", _page11],
    ["src/pages/comissoes/fechamento.astro", _page12],
    ["src/pages/dashboard/admin.astro", _page13],
    ["src/pages/dashboard/gestor.astro", _page14],
    ["src/pages/dashboard/logs.astro", _page15],
    ["src/pages/dashboard/permissoes.astro", _page16],
    ["src/pages/dashboard/index.astro", _page17],
    ["src/pages/documentacao/index.astro", _page18],
    ["src/pages/metas/vendedor.astro", _page19],
    ["src/pages/negado.astro", _page20],
    ["src/pages/operacao/comissionamento.astro", _page21],
    ["src/pages/orcamentos/index.astro", _page22],
    ["src/pages/parametros/comissoes/templates.astro", _page23],
    ["src/pages/parametros/metas.astro", _page24],
    ["src/pages/parametros/regras-comissao.astro", _page25],
    ["src/pages/parametros/tipo-produtos.astro", _page26],
    ["src/pages/parametros/index.astro", _page27],
    ["src/pages/perfil/index.astro", _page28],
    ["src/pages/relatorios/vendas.astro", _page29],
    ["src/pages/relatorios/vendas-por-cliente.astro", _page30],
    ["src/pages/relatorios/vendas-por-destino.astro", _page31],
    ["src/pages/relatorios/vendas-por-produto.astro", _page32],
    ["src/pages/test-env.astro", _page33],
    ["src/pages/vendas/cadastro.astro", _page34],
    ["src/pages/vendas/consulta.astro", _page35],
    ["src/pages/index.astro", _page36]
]);
const serverIslandMap = new Map();
const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _exports = createExports(_manifest);
const __astrojsSsrVirtualEntry = _exports.default;

export { __astrojsSsrVirtualEntry as default, pageMap };
