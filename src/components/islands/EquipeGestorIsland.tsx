import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

type UsuarioRow = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  uso_individual: boolean;
  company_id: string | null;
  user_types?: { name: string | null } | null;
};

type RelacaoRow = {
  vendedor_id: string;
  ativo?: boolean | null;
};

export default function EquipeGestorIsland() {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("Parametros");

  const [usuario, setUsuario] = useState<UsuarioRow | null>(null);
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<UsuarioRow[]>([]);
  const [relacoes, setRelacoes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [vendedorTypeId, setVendedorTypeId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [criando, setCriando] = useState(false);
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        return;
      }

      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id, nome_completo, email, uso_individual, company_id, user_types(name)")
        .eq("id", userId)
        .maybeSingle();
      if (userErr) throw userErr;

      const userData = (userRow as UsuarioRow) || null;
      setUsuario(userData);

      if (!userData?.company_id) {
        setErro("Seu usuário precisa estar vinculado a uma empresa.");
        return;
      }

      const { data: tiposData, error: tiposErr } = await supabase
        .from("user_types")
        .select("id, name");
      if (tiposErr) throw tiposErr;
      const tipoVendedor = (tiposData || []).find((t: any) =>
        String(t?.name || "").toUpperCase().includes("VENDEDOR")
      );
      setVendedorTypeId(tipoVendedor?.id || null);

      const { data: usersData, error: usersErr } = await supabase
        .from("users")
        .select("id, nome_completo, email, uso_individual, company_id, user_types(name)")
        .eq("company_id", userData.company_id)
        .eq("uso_individual", false)
        .order("nome_completo", { ascending: true });
      if (usersErr) throw usersErr;

      const usuariosFiltrados = (usersData || [])
        .filter((u: any) => {
          const tipo = u?.user_types?.name || "";
          return String(tipo).toUpperCase().includes("VENDEDOR");
        })
        .filter((u: any) => u.id !== userId) as UsuarioRow[];
      setUsuariosEmpresa(usuariosFiltrados);

      const { data: relData, error: relErr } = await supabase
        .from("gestor_vendedor")
        .select("vendedor_id, ativo")
        .eq("gestor_id", userId);
      if (relErr) throw relErr;

      const map: Record<string, boolean> = {};
      (relData as RelacaoRow[] | null || []).forEach((r) => {
        if (r?.vendedor_id) {
          map[r.vendedor_id] = r.ativo !== false;
        }
      });
      setRelacoes(map);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar equipe.");
    } finally {
      setLoading(false);
    }
  }

  function isGestorUser(u?: UsuarioRow | null) {
    const tipo = u?.user_types?.name || "";
    return String(tipo).toUpperCase().includes("GESTOR");
  }

  function gerarSenhaTemporaria(tamanho = 14) {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let senha = "";
    for (let i = 0; i < tamanho; i += 1) {
      senha += chars[Math.floor(Math.random() * chars.length)];
    }
    return senha;
  }

  async function criarUsuarioEquipe() {
    if (!usuario?.company_id || !usuario.id) {
      showToast("Gestor sem empresa vinculada.", "error");
      return;
    }
    if (!novoEmail.trim()) {
      showToast("Informe o e-mail do usuário.", "error");
      return;
    }
    if (!vendedorTypeId) {
      showToast("Tipo VENDEDOR não encontrado no sistema.", "error");
      return;
    }

    try {
      setCriando(true);
      const email = novoEmail.trim().toLowerCase();
      const senhaTemp = gerarSenhaTemporaria();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/perfil?onboarding=1`
          : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: senhaTemp,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (error) {
        showToast("Não foi possível criar o usuário. Verifique o e-mail.", "error");
        setCriando(false);
        return;
      }

      const authUser = data.user;
      if (authUser && authUser.identities && authUser.identities.length === 0) {
        showToast("Este e-mail já está cadastrado.", "warning");
        setCriando(false);
        return;
      }
      if (!authUser) {
        showToast("Usuário não retornado pela autenticação.", "error");
        setCriando(false);
        return;
      }

      const { error: insertErr } = await supabase.from("users").insert({
        id: authUser.id,
        email,
        nome_completo: novoNome || null,
        company_id: usuario.company_id,
        user_type_id: vendedorTypeId,
        uso_individual: false,
        created_by_gestor: true,
      });
      if (insertErr) throw insertErr;

      const { error: relErr } = await supabase
        .from("gestor_vendedor")
        .insert({ gestor_id: usuario.id, vendedor_id: authUser.id, ativo: true });
      if (relErr) throw relErr;

      showToast("Convite enviado! O usuário deve confirmar o e-mail.", "success");
      setNovoEmail("");
      setNovoNome("");
      setCreateOpen(false);
      await carregarDados();
    } catch (e) {
      console.error(e);
      showToast("Erro ao criar usuário da equipe.", "error");
    } finally {
      setCriando(false);
    }
  }

  async function toggleEquipe(userId: string) {
    if (!usuario?.id) return;
    setSalvandoId(userId);
    const ativoAtual = Boolean(relacoes[userId]);

    try {
      if (ativoAtual) {
        const { error } = await supabase
          .from("gestor_vendedor")
          .delete()
          .eq("gestor_id", usuario.id)
          .eq("vendedor_id", userId);
        if (error) throw error;
        setRelacoes((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        showToast("Vendedor removido da equipe.", "success");
      } else {
        await supabase
          .from("gestor_vendedor")
          .delete()
          .eq("gestor_id", usuario.id)
          .eq("vendedor_id", userId);
        const { error } = await supabase
          .from("gestor_vendedor")
          .insert({ gestor_id: usuario.id, vendedor_id: userId, ativo: true });
        if (error) throw error;
        setRelacoes((prev) => ({ ...prev, [userId]: true }));
        showToast("Vendedor adicionado à equipe.", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro ao atualizar equipe.", "error");
    } finally {
      setSalvandoId(null);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    if (!busca.trim()) return usuariosEmpresa;
    const term = busca.trim().toLowerCase();
    return usuariosEmpresa.filter((u) => {
      const nome = (u.nome_completo || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return nome.includes(term) || email.includes(term);
    });
  }, [busca, usuariosEmpresa]);

  if (loadingPerm) return <LoadingUsuarioContext />;
  if (!podeVer) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Você não possui acesso aos parâmetros.</h3>
      </div>
    );
  }

  if (!usuario) return null;

  if (!isGestorUser(usuario)) {
    return (
      <div className="card-base card-config">
        Apenas gestores podem definir equipes.
      </div>
    );
  }

  if (usuario.uso_individual) {
    return (
      <div className="card-base card-config">
        Usuários em plano individual não possuem equipe.
      </div>
    );
  }
  if (!vendedorTypeId) {
    return (
      <div className="card-base card-config">
        Tipo de usuário VENDEDOR não configurado. Cadastre em user_types.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-semibold">👥 Equipe do Gestor</h3>
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-3">
          <div className="text-sm opacity-75">
            {Object.keys(relacoes).length} vendedor(es) atribuídos
          </div>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            Novo usuário
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-3 mt-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {loading ? (
        <p className="mt-3">Carregando equipe...</p>
      ) : (
        <>
          {createOpen && (
            <div className="card-base card-config mt-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h4 className="text-lg font-semibold">Cadastrar usuário da equipe</h4>
                <button className="btn btn-light" onClick={() => setCreateOpen(false)}>
                  Fechar
                </button>
              </div>
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nome completo</label>
                  <input
                    className="form-input"
                    placeholder="Nome do vendedor"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail *</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="email@empresa.com"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    required
                  />
                  <small>Será enviado um e-mail para confirmação.</small>
                </div>
              </div>
              <div className="mobile-stack-buttons" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={criarUsuarioEquipe}
                  disabled={criando}
                >
                  {criando ? "Enviando..." : "Enviar convite"}
                </button>
              </div>
            </div>
          )}

          <div className="card-base card-blue mt-3 mb-3">
            <label className="form-label">Buscar usuário</label>
            <input
              className="form-input"
              placeholder="Nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <p className="text-xs mt-2" style={{ opacity: 0.7 }}>
              Apenas usuários corporativos da sua empresa aparecem aqui.
            </p>
          </div>

          <div className="table-container overflow-x-auto">
            <table className="table-default min-w-[720px]">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nenhum vendedor encontrado.</td>
                  </tr>
                )}
                {usuariosFiltrados.map((u) => {
                  const ativo = Boolean(relacoes[u.id]);
                  return (
                    <tr key={u.id}>
                      <td>{u.nome_completo || "—"}</td>
                      <td>{u.email || "—"}</td>
                      <td>{u.user_types?.name || "—"}</td>
                      <td>
                        <span
                          className="font-bold"
                          style={{ color: ativo ? "#16a34a" : "#64748b" }}
                        >
                          {ativo ? "Na equipe" : "Fora da equipe"}
                        </span>
                      </td>
                      <td className="th-actions">
                        <button
                          className={`btn ${ativo ? "btn-light" : "btn-primary"}`}
                          onClick={() => toggleEquipe(u.id)}
                          disabled={salvandoId === u.id}
                        >
                          {salvandoId === u.id
                            ? "Salvando..."
                            : ativo
                            ? "Remover"
                            : "Adicionar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
