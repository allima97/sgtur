import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { construirLinkWhatsApp } from "../../lib/whatsapp";

type Cliente = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  whatsapp?: string | null;
  company_id?: string | null;
};

export default function ClientesConsultaIsland() {
  const { permissao, loading: loadingPerm, ativo } = usePermissao("Clientes");
  const podeVer = permissao !== "none";
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "admin";

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user = sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !mounted) return;
        const { data, error } = await supabase.from("users").select("company_id").eq("id", user.id).maybeSingle();
        if (error) {
          console.error(error);
          return;
        }
        if (!mounted) return;
        setCompanyId(data?.company_id || null);
      } catch (e) {
        console.error(e);
      }
    }
    resolveCompany();
    return () => { mounted = false; };
  }, []);

  async function carregar() {
    if (!podeVer || !companyId) return;
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, cpf, telefone, email, whatsapp, company_id")
        .eq("company_id", companyId)
        .order("nome", { ascending: true });
      if (error) throw error;
      setClientes((data || []) as Cliente[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadingPerm && podeVer && companyId) carregar();
  }, [loadingPerm, podeVer, companyId]);

  const filtrados = useMemo(() => {
    const q = (busca || "").toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter((c) =>
      (c.nome || "").toLowerCase().includes(q) ||
      (c.cpf || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }, [clientes, busca]);

  const podeEditar = permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir = permissao === "delete" || permissao === "admin";

  async function excluirCliente(id: string) {
    if (!podeExcluir) {
      window.alert("Você não tem permissão para excluir clientes.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
      setClientes((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      window.alert("Erro ao excluir cliente.");
    }
  }

  async function editarCliente(id: string, atualNome: string) {
    if (!podeEditar) {
      window.alert("Você não tem permissão para editar clientes.");
      return;
    }
    const novo = window.prompt("Editar nome do cliente:", atualNome);
    if (!novo || novo.trim() === atualNome) return;
    try {
      const { error } = await supabase.from("clientes").update({ nome: novo.trim() }).eq("id", id);
      if (error) throw error;
      setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, nome: novo.trim() } : c)));
    } catch (e) {
      console.error(e);
      window.alert("Erro ao editar cliente.");
    }
  }

  function abrirHistorico(id: string, nome?: string) {
    window.alert(`Abrir histórico do cliente: ${nome || id}`);
  }

  if (loadingPerm) return <div className="clientes-page"><div className="card-base card-config">Carregando contexto...</div></div>;
  if (!ativo) return <div className="clientes-page">Você não possui acesso ao módulo de Clientes.</div>;

  return (
    <div className={`clientes-page${podeCriar ? " has-mobile-actionbar" : ""}`}>
      <div className="card-base mb-3 list-toolbar-sticky">
        <div className="form-row" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="form-group flex-1 min-w-0">
            <label className="form-label">Buscar cliente</label>
            <input className="form-input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, CPF ou e-mail" />
          </div>
          {podeCriar && (
            <div className="hidden sm:flex sm:items-end sm:ml-auto">
              <button type="button" className="btn btn-primary">Adicionar cliente</button>
            </div>
          )}
        </div>
      </div>

      {erro && (<div className="card-base card-config mb-3"><strong>{erro}</strong></div>)}

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue clientes-table table-mobile-cards">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th className="th-actions" style={{ textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4}>Carregando...</td></tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr><td colSpan={4}>Nenhum cliente encontrado.</td></tr>
            )}
            {!loading && filtrados.map((c) => (
              <tr key={c.id}>
                <td data-label="Nome">{c.nome}</td>
                <td data-label="CPF">{c.cpf}</td>
                <td data-label="Telefone">{c.telefone || "-"}</td>
                <td data-label="E-mail">{c.email || "-"}</td>
                <td className="th-actions" data-label="Ações">
                  <div className="action-buttons">
                    {(() => {
                      const whatsappLink = construirLinkWhatsApp(c.whatsapp || c.telefone || "");
                      if (whatsappLink) {
                        return (
                          <a className="btn-icon" href={whatsappLink} title="Abrir WhatsApp" target="_blank" rel="noreferrer">💬</a>
                        );
                      }
                      return null;
                    })()}

                    <button className="btn-icon" onClick={() => abrirHistorico(c.id, c.nome)} title="Histórico">🗂️</button>

                    {podeEditar && (
                      <button className="btn-icon" onClick={() => editarCliente(c.id, c.nome)} title="Editar">✏️</button>
                    )}

                    {podeExcluir && (
                      <button className="btn-icon btn-danger" onClick={() => excluirCliente(c.id)} title="Excluir">🗑️</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {podeCriar && (
        <div className="mobile-actionbar sm:hidden">
          <button type="button" className="btn btn-primary">Adicionar cliente</button>
        </div>
      )}
    </div>
  );
}
