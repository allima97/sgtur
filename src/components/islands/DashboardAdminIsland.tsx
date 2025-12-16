import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

type Empresa = {
  id: string;
  nome_empresa: string;
  nome_fantasia: string;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
  active?: boolean | null;
};

type Usuario = {
  id: string;
  nome_completo: string;
  email: string | null;
  user_types?: { name: string } | null;
  active: boolean;
};

type Gestor = {
  id: string;
  nome_completo: string;
  vendedores: number;
};

type SistemaCount = {
  clientes: number;
  vendas: number;
  produtos: number;
  tipos: number;
};

export default function DashboardAdminIsland() {
  const { permissao, ativo, loading: loadingPerm } =
    usePermissao("AdminDashboard");

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [sistema, setSistema] = useState<SistemaCount>({
    clientes: 0,
    vendas: 0,
    produtos: 0,
    tipos: 0,
  });

  // =========================================================
  // VERIFICAR SE O USUÁRIO É ADMIN
  // =========================================================
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadAdmin() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;

        const { data: u } = await supabase
          .from("users")
          .select("id, user_types(name)")
          .eq("id", data.user.id)
          .maybeSingle();

        const tipo = u?.user_types?.name?.toUpperCase() || "";
        setIsAdmin(tipo.includes("ADMIN"));
      } catch (e) {
        console.error(e);
      }
    }
    loadAdmin();
  }, []);

  // bloquear quem não é admin
  if (loadingPerm) return <div>Carregando permissões...</div>;
  if (!ativo || !isAdmin)
    return (
      <div style={{ padding: 20 }}>
        <h3>Apenas administradores podem acessar este dashboard.</h3>
      </div>
    );

  // =========================================================
  // CARREGAR DADOS ADMINISTRATIVOS
  // =========================================================
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErro(null);

        // EMPRESAS
        const { data: emp } = await supabase
          .from("companies")
          .select("*")
          .order("nome_fantasia");

        setEmpresas(emp || []);

        // USUÁRIOS
        const { data: usu } = await supabase
          .from("users")
          .select("id, nome_completo, email, active, user_types(name)")
          .order("nome_completo");

        setUsuarios(usu || []);

        // GESTORES + QUANTIDADE DE VENDEDORES
        const { data: gest } = await supabase
          .from("users")
          .select("id, nome_completo, user_types(name)")
          .contains("user_types(name)", ["GESTOR"]);

        let listaGestores: Gestor[] = [];
        if (gest) {
          for (const g of gest) {
            const { count } = await supabase
              .from("gestor_vendedor")
              .select("*", { count: "exact", head: true })
              .eq("gestor_id", g.id);

            listaGestores.push({
              id: g.id,
              nome_completo: g.nome_completo,
              vendedores: count || 0,
            });
          }
        }
        setGestores(listaGestores);

        // CONTAGEM DO SISTEMA
        const tabelas = [
          { chave: "clientes", tabela: "clientes" },
          { chave: "vendas", tabela: "vendas" },
          { chave: "produtos", tabela: "produtos" }, // destinos/produtos cadastrados
          { chave: "tipos", tabela: "tipo_produtos" },
        ];
        const resultado: SistemaCount = { clientes: 0, vendas: 0, produtos: 0, tipos: 0 };

        for (const { chave, tabela } of tabelas) {
          const { count } = await supabase
            .from(tabela)
            .select("*", { count: "exact", head: true });

          (resultado as any)[chave] = count || 0;
        }

        setSistema(resultado);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar dados administrativos.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // =========================================================
  // UI PRINCIPAL
  // =========================================================

  return (
    <div className="dashboard-admin-page">

      {/* INDICADOR */}
      <div className="mb-4 p-4 rounded-lg bg-rose-950 border border-rose-700 text-rose-100">
        <strong>Dashboard Administrativo</strong> — Controle Geral do Sistema
      </div>

      {/* KPIs do Sistema */}
      <div className="card-base card-red mb-3">
        <h3 className="mb-3 font-semibold text-lg">Visão geral do sistema</h3>
        <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <div className="kpi-card">
            <div className="kpi-label">Clientes</div>
            <div className="kpi-value">{sistema.clientes}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Vendas</div>
            <div className="kpi-value">{sistema.vendas}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Produtos</div>
            <div className="kpi-value">{sistema.produtos}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Tipos de produto</div>
            <div className="kpi-value">{sistema.tipos}</div>
          </div>
        </div>
      </div>

      {/* EMPRESAS */}
      <div className="card-base card-red mb-3">
        <h3 className="mb-2 font-semibold">Empresas cadastradas</h3>
        <div className="table-container overflow-x-auto">
          <table className="table-default table-header-red min-w-[760px]">
            <thead>
              <tr>
                <th>Nome fantasia</th>
                <th>Razão Social</th>
                <th>CNPJ</th>
                <th>Cidade</th>
                <th>UF</th>
              </tr>
            </thead>

            <tbody>
              {empresas.length === 0 && (
                <tr>
                  <td colSpan={5}>Nenhuma empresa cadastrada.</td>
                </tr>
              )}

              {empresas.map((e) => (
                <tr key={e.id}>
                  <td>{e.nome_fantasia}</td>
                  <td>{e.nome_empresa}</td>
                  <td>{e.cnpj}</td>
                  <td>{e.cidade || "-"}</td>
                  <td>{e.estado || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USUÁRIOS */}
      <div className="card-base card-red mb-3">
        <h3 className="mb-2 font-semibold">Usuários do sistema</h3>
        <div className="table-container overflow-x-auto">
          <table className="table-default table-header-red min-w-[640px]">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Tipo</th>
                <th>Ativo</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4}>Nenhum usuário encontrado.</td>
                </tr>
              )}

              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nome_completo}</td>
                  <td>{u.email || "-"}</td>
                  <td>{u.user_types?.name || "-"}</td>
                  <td className={u.active ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                    {u.active ? "Sim" : "Não"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GESTORES */}
      <div className="card-base card-red mb-3">
        <h3 style={{ marginBottom: 10 }}>Gestores & Equipes</h3>

        <div className="table-container overflow-x-auto">
          <table className="table-default table-header-red min-w-[520px]">
            <thead>
              <tr>
                <th>Gestor</th>
                <th>Qtd. Vendedores</th>
              </tr>
            </thead>

            <tbody>
              {gestores.length === 0 && (
                <tr>
                  <td colSpan={2}>Nenhum gestor encontrado.</td>
                </tr>
              )}

              {gestores.map((g) => (
                <tr key={g.id}>
                  <td>{g.nome_completo}</td>
                  <td>{g.vendedores}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {erro && (
        <div className="card-base card-config">{erro}</div>
      )}

      {loading && <div>Carregando dados...</div>}
    </div>
  );
}
