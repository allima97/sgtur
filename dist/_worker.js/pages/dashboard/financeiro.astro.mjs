globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_1RrlcxID.mjs';
import { s as supabaseServer } from '../../chunks/supabaseServer_Bnj8n5MI.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';

const $$Financeiro = createComponent(async ($$result, $$props, $$slots) => {
  const { data: sales } = await supabaseServer.from("sale").select("total, paid_total, balance_due, financial_status");
  const { data: commissions } = await supabaseServer.from("commission_ledger").select("amount, status");
  const { data: recentSales } = await supabaseServer.from("sale").select("id, total, paid_total, balance_due, financial_status, created_at").order("created_at", { ascending: false }).limit(10);
  const receitaTotal = sales?.reduce((s, r) => s + Number(r.total), 0) ?? 0;
  const recebido = sales?.reduce((s, r) => s + Number(r.paid_total), 0) ?? 0;
  const aReceber = sales?.reduce((s, r) => s + Number(r.balance_due), 0) ?? 0;
  const vendasAbertas = sales?.filter(
    (s) => s.financial_status === "UNPAID" || s.financial_status === "PARTIALLY_PAID"
  ).length ?? 0;
  const comissaoPendente = commissions?.filter((c) => c.status === "PENDING").reduce((s, c) => s + Number(c.amount), 0) ?? 0;
  const comissaoAprovada = commissions?.filter((c) => c.status === "APPROVED").reduce((s, c) => s + Number(c.amount), 0) ?? 0;
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard Financeiro" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="page-content-wrap"> <div class="page-header blue-header"> <div> <h1>Dashboard Financeiro</h1> <p>Resumo de vendas e comissões</p> </div> </div> <section class="card-base mb-3"> <h2 class="page-title">Resumo</h2> <ul> <li><strong>Receita total:</strong> BRL ${receitaTotal}</li> <li><strong>Recebido:</strong> BRL ${recebido}</li> <li><strong>A receber:</strong> BRL ${aReceber}</li> <li><strong>Vendas abertas:</strong> ${vendasAbertas}</li> </ul> </section> <section class="card-base mb-3"> <h2 class="page-title">Comissões</h2> <ul> <li><strong>Pendente:</strong> BRL ${comissaoPendente}</li> <li><strong>Aprovada:</strong> BRL ${comissaoAprovada}</li> </ul> </section> <section class="card-base"> <h2 class="page-title">Últimas vendas</h2> <div class="table-container overflow-x-auto"> <table class="table-default table-header-blue table-mobile-cards min-w-[520px]"> <thead> <tr> <th>ID</th> <th>Total</th> <th>Pago</th> <th>Saldo</th> <th>Status</th> </tr> </thead> <tbody> ${recentSales?.map((s) => renderTemplate`<tr> <td data-label="ID">${s.id}</td> <td data-label="Total">BRL ${s.total}</td> <td data-label="Pago">BRL ${s.paid_total}</td> <td data-label="Saldo">BRL ${s.balance_due}</td> <td data-label="Status">${s.financial_status}</td> </tr>`)} </tbody> </table> </div> </section> </div> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/financeiro.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/financeiro.astro";
const $$url = "/dashboard/financeiro";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Financeiro,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
