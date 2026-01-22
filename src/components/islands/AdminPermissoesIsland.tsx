import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type Usuario = {
  id: string;
  nome_completo: string;
  email: string | null;
  active: boolean;
};

type ModuloAcesso = {
  id: string;
  usuario_id: string;
  modulo: string;
  permissao: NivelPermissao;
  ativo: boolean;
};

type NivelPermissao =
  | "none"
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "admin";

const MODULOS: string[] = [
  "Dashboard",
  "Clientes",
  "Vendas",
  "Orcamentos",
  "Operacao",
  "Viagens",
  "Comissionamento",
  "Cadastros",
  "Paises",
  "Cidades",
  "Destinos",
  "Produtos",
  "Relatorios",
  "Parametros",
  "Metas",
  "RegrasComissao",
  "Admin",
  "AdminDashboard",
  "AdminLogs",
  "AdminUsers",
];


const NIVEIS: { value: NivelPermissao; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "view", label: "Ver" },
  { value: "create", label: "Criar" },
  { value: "edit", label: "Editar" },
  { value: "delete", label: "Excluir" },
  { value: "admin", label: "Admin" },
];

export default function AdminPermissoesIsland() {
  const { permissao, ativo, loading: loadingAdminPerm } = usePermissao("Admin"); // módulo Admin

  const [usuarioLogadoId, setUsuarioLogadoId] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [acessos, setAcessos] = useState<ModuloAcesso[]>([]);

  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<Usuario | null>(null);

  const [formPermissoes, setFormPermissoes] = useState<
    Record<string, NivelPermissao>
  >({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = permissao === "admin";

  // ---------------------------------------
  // LOAD INICIAL
  // ---------------------------------------
  useEffect(() => {
    carregar();
  }, []);

  async function carregar(): Promise<{ usuarios: Usuario[]; acessos: ModuloAcesso[] }> {
    try {
      setLoading(true);
      setErro(null);

      // usuario logado
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id || null;
      setUsuarioLogadoId(userId);

      // usuarios
      const { data: usersData, error: usersErr } = await supabase
        .from("users")
        .select("id, nome_completo, email, active")
        .order("nome_completo", { ascending: true });

      if (usersErr) throw usersErr;

      const usuariosCarregados = (usersData || []) as Usuario[];
      setUsuarios(usuariosCarregados);

      // acessos
      const { data: acessosData, error: accErr } = await supabase
        .from("modulo_acesso")
        .select("*");

      if (accErr) throw accErr;

      const acessosCarregados = (acessosData || []) as ModuloAcesso[];
      setAcessos(acessosCarregados);

      return { usuarios: usuariosCarregados, acessos: acessosCarregados };
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar permissões.");
      return { usuarios: [], acessos: [] };
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------
  // FILTRO DE USUÁRIOS
  // ---------------------------------------
  const usuariosFiltrados = useMemo(() => {
    if (!busca.trim()) return usuarios;
    const t = busca.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.nome_completo.toLowerCase().includes(t) ||
        (u.email || "").toLowerCase().includes(t),
    );
  }, [usuarios, busca]);

  // ---------------------------------------
  // EDITOR DE PERMISSÕES
  // ---------------------------------------
  function abrirEditor(u: Usuario, acessosFonte?: ModuloAcesso[]) {
    setSelecionado(u);

    const perms: Record<string, NivelPermissao> = {};
    for (const modulo of MODULOS) {
      const ativa = acessosFonte ?? acessos;
      const reg = ativa.find(
        (a) => a.usuario_id === u.id && a.modulo === modulo,
      );
      perms[modulo] = reg ? reg.permissao : "none";
    }
    setFormPermissoes(perms);
  }

  function handleChangeNivel(modulo: string, value: string) {
    setFormPermissoes((prev) => ({
      ...prev,
      [modulo]: value as NivelPermissao,
    }));
  }

  async function salvarPermissoes() {
    if (!selecionado) return;
    if (!isAdmin) {
      setErro("Somente ADMIN pode alterar permissões.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);


      for (const modulo of MODULOS) {
        const nivel = formPermissoes[modulo] || "none";
        const existente = acessos.find(
          (a) => a.usuario_id === selecionado.id && a.modulo === modulo,
        );

        if (!existente) {
          // criar novo registro
          await supabase.from("modulo_acesso").insert({
            usuario_id: selecionado.id,
            modulo,
            permissao: nivel,
            ativo: nivel !== "none",
          });
        } else {
          // atualizar
          await supabase
            .from("modulo_acesso")
            .update({
              permissao: nivel,
              ativo: nivel !== "none",
            })
            .eq("id", existente.id);
        }
      }

      await registrarLog({
        user_id: usuarioLogadoId,
        acao: "permissoes_atualizadas",
        modulo: "Admin",
        detalhes: {
          usuario_alterado_id: selecionado.id,
          permissoes: formPermissoes,
        },
      });

      const { usuarios: usuariosAtualizados, acessos: acessosAtualizados } = await carregar();
      // manter selecionado na tela com dados atualizados
      const u = usuariosAtualizados.find((x) => x.id === selecionado.id) || null;
      if (u) abrirEditor(u, acessosAtualizados);
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar permissões.");
    } finally {
      setSalvando(false);
    }
  }

  async function toggleUsuarioAtivo(u: Usuario) {
    try {
      const novo = !u.active;
      const { error } = await supabase
        .from("users")
        .update({ active: novo })
        .eq("id", u.id);

      if (error) throw error;

      await registrarLog({
        user_id: usuarioLogadoId,
        acao: novo ? "usuario_ativado" : "usuario_bloqueado",
        modulo: "Admin",
        detalhes: { usuario_alterado_id: u.id },
      });

      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao alterar status do usuário.");
    }
  }

  // ---------------------------------------
  // UI
  // ---------------------------------------
  if (loadingAdminPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return <div>Acesso ao módulo de Admin bloqueado.</div>;
  }

  if (!isAdmin) {
    return <div>Somente usuários ADMIN podem gerenciar permissões.</div>;
  }

  if (loading) {
    return <div>Carregando dados de permissões...</div>;
  }

  return (
    <div className="admin-permissoes-page">
      {/* FILTRO + INFO */}
      <div className="card-base card-blue mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Buscar usuário</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou e-mail..."
            />
          </div>
        </div>

        {erro && (
          <div className="card-base card-config mt-2">
            <strong>{erro}</strong>
          </div>
        )}
      </div>

      {/* TABELA DE USUÁRIOS */}
      <div className="table-container mb-3 overflow-x-auto">
        <table className="table-default table-header-blue table-mobile-cards min-w-[780px]">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Status</th>
              <th className="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhum usuário encontrado.</td>
              </tr>
            )}

            {usuariosFiltrados.map((u) => (
              <tr key={u.id}>
                <td data-label="Nome">{u.nome_completo}</td>
                <td data-label="E-mail">{u.email || "-"}</td>
                <td data-label="Status">{u.active ? "Ativo" : "Bloqueado"}</td>
                <td className="th-actions" data-label="Ações">
                  <div className="action-buttons">
                    <button
                      className="btn-icon"
                      title="Editar permissões"
                      onClick={() => abrirEditor(u)}
                    >
                      ⚙️
                    </button>
                    {usuarioLogadoId !== u.id && (
                      <button
                        className={`btn-icon ${
                          u.active ? "btn-danger" : ""
                        }`}
                        title={u.active ? "Bloquear usuário" : "Reativar usuário"}
                        onClick={() => toggleUsuarioAtivo(u)}
                      >
                        {u.active ? "🚫" : "✅"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EDITOR DE PERMISSÕES DO USUÁRIO SELECIONADO */}
      {selecionado && (
        <div className="card-base card-blue">
          <h3>
            Permissões de: <span className="font-semibold">{selecionado.nome_completo}</span>
          </h3>
          <div className="table-container overflow-x-auto">
            <table className="table-default table-header-blue table-mobile-cards min-w-[500px]">
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th>Nível</th>
                </tr>
              </thead>
              <tbody>
                {MODULOS.map((modulo) => (
                  <tr key={modulo}>
                    <td data-label="Módulo">{modulo}</td>
                    <td data-label="Nível">
                      <select
                        className="form-select"
                        value={formPermissoes[modulo] || "none"}
                        onChange={(e) => handleChangeNivel(modulo, e.target.value)}
                      >
                        {NIVEIS.map((n) => (
                          <option key={n.value} value={n.value}>
                            {n.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 mobile-stack-buttons">
            <button
              className="btn btn-primary"
              onClick={salvarPermissoes}
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Salvar permissões"}
            </button>
            <button
              className="btn btn-light"
              onClick={() => setSelecionado(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
