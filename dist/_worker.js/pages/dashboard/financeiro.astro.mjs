globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderHead, d as renderTemplate } from '../../chunks/astro/server_CVPGTMFc.mjs';
import { s as supabaseServer } from '../../chunks/supabaseServer_DS59bdrg.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_APQgoOvT.mjs';

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
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="UTF-8">${renderHead()}</head> <body> <h1>📊 Dashboard Financeiro</h1> <section> <h2>Resumo</h2> <ul> <li><strong>Receita total:</strong> BRL ${receitaTotal}</li> <li><strong>Recebido:</strong> BRL ${recebido}</li> <li><strong>A receber:</strong> BRL ${aReceber}</li> <li><strong>Vendas abertas:</strong> ${vendasAbertas}</li> </ul> </section> <section> <h2>Comissões</h2> <ul> <li><strong>Pendente:</strong> BRL ${comissaoPendente}</li> <li><strong>Aprovada:</strong> BRL ${comissaoAprovada}</li> </ul> </section> <section> <h2>Últimas vendas</h2> <table border="1" cellpadding="6"> <thead> <tr> <th>ID</th> <th>Total</th> <th>Pago</th> <th>Saldo</th> <th>Status</th> </tr> </thead> <tbody> ${recentSales?.map((s) => renderTemplate`<tr> <td>${s.id}</td> <td>BRL ${s.total}</td> <td>BRL ${s.paid_total}</td> <td>BRL ${s.balance_due}</td> <td>${s.financial_status}</td> </tr>`)} </tbody> </table> </section> </body></html>`;
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
