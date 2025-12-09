import { registrarLog } from "./logs";

export async function auditarVenda(
  acao:
    | "venda_criada"
    | "venda_editada"
    | "venda_cancelada"
    | "venda_remarcada"
    | "recibo_adicionado"
    | "recibo_editado"
    | "recibo_excluido",
  dados: any
) {
  const user_id = dados?.user_id || null;

  await registrarLog({
    user_id,
    acao,
    modulo: "vendas",
    detalhes: dados
  });
}
