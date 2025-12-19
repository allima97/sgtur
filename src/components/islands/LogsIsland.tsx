import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type LogEntry = {
  id: string;
  user_id: string;
  acao: string;
  modulo: string | null;
  detalhes: any;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  users?: { nome_completo: string | null } | null;
};

export default function LogsIsland() {
  const { permissao, ativo, loading: loadingPerm } =
    usePermissao("AdminDashboard");

  const [isAdmin, setIsAdmin] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [busca, setBusca] = useState("");

  // Modal
  const [logSelecionado, setLogSelecionado] = useState<LogEntry | null>(null);

  // ---------------------------------------------------------------
  // VALIDAR SE É ADMIN
  // ---------------------------------------------------------------
  useEffect(() => {
    async function validar() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data: u } = await supabase
        .from("users")
        .select("id, user_types(name)")
        .eq("id", auth.user.id)
        .maybeSingle();

      const tipo = u?.user_types?.name?.toUpperCase() || "";
      setIsAdmin(tipo.includes("ADMIN"));
    }

    validar();
  }, []);

  if (loadingPerm) return <LoadingUsuarioContext />;

  if (!ativo || !isAdmin)
    return (
      <div style={{ padding: 20 }}>
        <h3>Apenas administradores podem acessar os logs.</h3>
      </div>
    );

  // ---------------------------------------------------------------
  // CARREGAR LOGS
  // ---------------------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErro(null);

        const { data: logsData, error: logsErr } = await supabase
          .from("logs")
          .select(
            `
            *,
            users:users (nome_completo)
          `
          )
          .order("created_at", { ascending: false });

        if (logsErr) throw logsErr;

        setLogs(logsData || []);

        const { data: uData } = await supabase
          .from("users")
          .select("id, nome_completo")
          .order("nome_completo");

        setUsuarios(uData || []);
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar logs.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ---------------------------------------------------------------
  // FILTRAGEM
  // ---------------------------------------------------------------
  const logsFiltrados = useMemo(() => {
    let result = logs;

    if (filtroUsuario) {
      result = result.filter((l) => l.user_id === filtroUsuario);
    }

    if (filtroModulo) {
      result = result.filter((l) => (l.modulo || "") === filtroModulo);
    }

    if (filtroAcao) {
      result = result.filter((l) => l.acao === filtroAcao);
    }

    if (busca.trim()) {
      const t = busca.toLowerCase();
      result = result.filter((l) => {
        const texto =
          JSON.stringify(l).toLowerCase() +
          (l.users?.nome_completo || "").toLowerCase();
        return texto.includes(t);
      });
    }

    return result;
  }, [logs, filtroUsuario, filtroModulo, filtroAcao, busca]);

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------

  return (
    <div className="logs-admin-page">
      <div className="mb-4 p-4 rounded-lg bg-rose-950 border border-rose-700 text-rose-100">
        <strong>Logs de Auditoria</strong> — todas as ações do sistema
      </div>

      {/* FILTROS */}
      <div className="card-base card-red mb-3">
        <h3 style={{ marginBottom: 12 }}>Filtros</h3>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <select
              className="form-select"
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome_completo}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Módulo</label>
            <select
              className="form-select"
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="permissoes">Permissões</option>
              <option value="vendas">Vendas</option>
              <option value="clientes">Clientes</option>
              <option value="cadastros">Cadastros</option>
              <option value="login">Login</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ação</label>
            <select
              className="form-select"
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
            >
              <option value="">Todas</option>
              {Array.from(new Set(logs.map((l) => l.acao))).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row mt-2">
          <div className="form-group">
            <label className="form-label">Busca livre</label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar em qualquer campo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="card-base card-red">
        <h3 className="mb-3 font-semibold">Registros ({logsFiltrados.length})</h3>
        <div className="table-container overflow-x-auto">
          <table className="table-default table-header-red min-w-[820px]">
            <thead>
              <tr>
                <th className="min-w-[150px]">Data</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Módulo</th>
                <th>IP</th>
                <th>Ver</th>
              </tr>
            </thead>
            <tbody>
              {logsFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6}>Nenhum log encontrado.</td>
                </tr>
              )}
              {logsFiltrados.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td>{l.users?.nome_completo || "Desconhecido"}</td>
                  <td>{l.acao}</td>
                  <td>{l.modulo || "-"}</td>
                  <td>{l.ip || "-"}</td>
                  <td>
                    <button
                      className="btn btn-light"
                      onClick={() => setLogSelecionado(l)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALHES */}
      {logSelecionado && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[100]">
          <div className="w-[95%] max-w-[700px] max-h-[90vh] overflow-y-auto bg-slate-800 p-5 rounded-xl text-slate-100">
            <div className="flex justify-between mb-2">
              <h3>Detalhes do log</h3>
              <button
                className="btn btn-light"
                onClick={() => setLogSelecionado(null)}
              >
                Fechar
              </button>
            </div>
            <p>
              <strong>Usuário:</strong> {logSelecionado.users?.nome_completo}
            </p>
            <p>
              <strong>Ação:</strong> {logSelecionado.acao}
            </p>
            <p>
              <strong>Módulo:</strong> {logSelecionado.modulo}
            </p>
            <p>
              <strong>Data:</strong> {new Date(logSelecionado.created_at).toLocaleString("pt-BR")}
            </p>
            <p>
              <strong>IP:</strong> {logSelecionado.ip || "-"}
            </p>
            <p className="mt-3">
              <strong>Detalhes:</strong>
            </p>
            <pre className="bg-slate-900 p-3 rounded text-xs whitespace-pre-wrap">
              {JSON.stringify(logSelecionado.detalhes, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
