import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

type Cliente = { id: string; nome: string };
type Destino = { id: string; nome: string };
type TipoProduto = { id: string; nome: string | null; tipo?: string };

type StatusOrcamento = "novo" | "enviado" | "negociando" | "fechado" | "perdido";

export default function OrcamentosCadastroIsland() {
  const { ativo } = usePermissao("Vendas");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [produtos, setProdutos] = useState<TipoProduto[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [status, setStatus] = useState<StatusOrcamento>("novo");
  const [valor, setValor] = useState<string>("");
  const [dataViagem, setDataViagem] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    carregarListas();
  }, []);

  async function carregarListas() {
    try {
      const [c, d, p] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase
          .from("produtos")
          .select("id, nome")
          .eq("ativo", true)
          .order("nome"),
        supabase.from("tipo_produtos").select("id, nome, tipo").eq("ativo", true).order("nome"),
      ]);

      if (c.data) setClientes(c.data as Cliente[]);
      if (d.data) setDestinos(d.data as Destino[]);
      if (p.data) setProdutos(p.data as Produto[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar listas.");
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!clienteId || !destinoId || !status) {
      setErro("Cliente, destino e status são obrigatórios.");
      return;
    }

    try {
      setSalvando(true);
      const payload = {
        cliente_id: clienteId,
        destino_id: destinoId || null,
        produto_id: produtoId || null,
        status,
        valor: valor ? parseFloat(valor) : null,
        data_viagem: dataViagem || null,
        notas: notas || null,
      };

      const { error } = await supabase.from("orcamentos").insert(payload);
      if (error) throw error;

      setSucesso("Orçamento criado.");
      setClienteId("");
      setDestinoId("");
      setProdutoId("");
      setStatus("novo");
      setValor("");
      setDataViagem("");
      setNotas("");
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar orçamento.");
    } finally {
      setSalvando(false);
    }
  }

  if (!ativo) return <div>Acesso ao módulo de Vendas bloqueado.</div>;

  return (
    <div className="card-base card-blue mb-3">
      <h2 className="card-title">Novo Orçamento</h2>

      {erro && <div className="auth-error">{erro}</div>}
      {sucesso && <div className="auth-success">{sucesso}</div>}

      <form onSubmit={salvar}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Cliente *</label>
            <select
              className="form-select"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Destino *</label>
            <select
              className="form-select"
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de produto</label>
            <select
              className="form-select"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              <option value="">(Opcional)</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome || p.tipo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusOrcamento)}
            >
              <option value="novo">Novo</option>
              <option value="enviado">Enviado</option>
              <option value="negociando">Negociando</option>
              <option value="fechado">Fechado</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Valor estimado (R$)</label>
            <input
              className="form-input"
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              min={0}
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data da viagem</label>
            <input
              className="form-input"
              type="date"
              value={dataViagem}
              onChange={(e) => setDataViagem(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notas</label>
          <textarea
            className="form-input"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observações, próximos passos..."
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={salvando}
          style={{ marginTop: 12 }}
        >
          {salvando ? "Salvando..." : "Criar orçamento"}
        </button>
      </form>
    </div>
  );
}
