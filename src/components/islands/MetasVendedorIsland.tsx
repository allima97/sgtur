import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import ConfirmDialog from "../ui/ConfirmDialog";

type Usuario = {
  id: string;
  nome_completo: string;
  uso_individual: boolean;
  company_id: string | null;
  user_types?: { name: string | null } | { name: string | null }[] | null;
};

type Meta = {
  id: string;
  vendedor_id: string;
  periodo: string; // YYYY-MM-01
  meta_geral: number;
  meta_diferenciada: number;
  ativo: boolean;
  produto_diferenciado_id?: string | null;
};

type MetaProduto = {
  meta_vendedor_id: string;
  produto_id: string;
  valor: number;
};

function extrairNomesTipos(usuario?: Usuario | null) {
  if (!usuario?.user_types) return [];
  if (Array.isArray(usuario.user_types)) {
    return usuario.user_types.map((ut) => ut?.name || "").filter(Boolean);
  }
  return [usuario.user_types.name || ""].filter(Boolean);
}

const isUsuarioVendedor = (usuario?: Usuario | null) =>
  extrairNomesTipos(usuario).some((nome) => nome.toUpperCase().includes("VENDEDOR"));

const isUsuarioGestor = (usuario?: Usuario | null) =>
  extrairNomesTipos(usuario).some((nome) => nome.toUpperCase().includes("GESTOR"));

const isUsuarioAdmin = (usuario?: Usuario | null) =>
  extrairNomesTipos(usuario).some((nome) => nome.toUpperCase().includes("ADMIN"));

export default function MetasVendedorIsland() {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("Metas");
  const isAdmin = can("Metas", "admin");
  const isEdit = !isAdmin && can("Metas", "edit");
  const [parametros, setParametros] = useState<{
    foco_valor?: "bruto" | "liquido";
  } | null>(null);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [vendedores, setVendedores] = useState<Usuario[]>([]);
  const [equipeIds, setEquipeIds] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<{ id: string; nome: string }[]>([]);

  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>("");
  const [periodo, setPeriodo] = useState<string>(new Date().toISOString().slice(0, 7));
  const [ativoMeta, setAtivoMeta] = useState<boolean>(true);

  const [metaGeral, setMetaGeral] = useState<string>("");
  const [metaProdutos, setMetaProdutos] = useState<{ produto_id: string; valor: string }[]>([]);

  const [metaEquipeGeral, setMetaEquipeGeral] = useState<string>("");
  const [gestorParticipa, setGestorParticipa] = useState<boolean>(false);
  const [metaGestor, setMetaGestor] = useState<string>("");
  const [metaEquipeProdutos, setMetaEquipeProdutos] = useState<{ produto_id: string; valor: string }[]>([]);
  const [periodoEquipe, setPeriodoEquipe] = useState<string>(new Date().toISOString().slice(0, 7));
  const [ativoEquipe, setAtivoEquipe] = useState<boolean>(true);
  const [salvandoEquipe, setSalvandoEquipe] = useState<boolean>(false);
  const [erroEquipe, setErroEquipe] = useState<string | null>(null);

  const [listaMetas, setListaMetas] = useState<Meta[]>([]);
  const [detalhesMetas, setDetalhesMetas] = useState<Record<string, MetaProduto[]>>({});
  const [editId, setEditId] = useState<string | null>(null);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarFormularioMeta, setMostrarFormularioMeta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [metaParaExcluir, setMetaParaExcluir] = useState<Meta | null>(null);

  // =============================================
  // 1. CARREGAR USUÁRIO LOGADO + VENDEDORES
  // =============================================
  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoadingMeta(true);

      // usuário logado
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      if (!userId) {
        setErro("Usuário não autenticado.");
        return;
      }

      const { data: usuarios } = await supabase
        .from("users")
        .select("id, nome_completo, uso_individual, company_id, user_types(name)");

      const logado = (usuarios || []).find((u) => u.id === userId) || null;
      setUsuario(logado);
      const gestorLocal = isUsuarioGestor(logado);

      // carregar produtos ativos
      const { data: produtosData } = await supabase
        .from("tipo_produtos")
        .select("id, nome")
        .eq("ativo", true);
      setProdutos(produtosData || []);

      // selecionar vendedores da empresa
      const isAdminLocal = can("Metas", "admin");
      const isEditLocal = can("Metas", "edit");

      let equipeIdsLocal: string[] = [];
      let equipeUsuarios: Usuario[] = [];
      if (gestorLocal) {
        const { data: rel } = await supabase
          .from("gestor_vendedor")
          .select("vendedor_id")
          .eq("gestor_id", userId);
        equipeIdsLocal =
          rel
            ?.map((r: any) => r.vendedor_id)
            .filter((id: string | null): id is string => Boolean(id)) || [];
        equipeUsuarios = (usuarios || []).filter((u: any) =>
          equipeIdsLocal.includes(u.id)
        ) as Usuario[];
      }
      setEquipeIds(equipeIdsLocal);

      let vendedoresDisponiveis: Usuario[] = [];
      if (isAdminLocal) {
        vendedoresDisponiveis = logado?.company_id
          ? (usuarios || []).filter((u: any) => u.company_id === logado.company_id) as Usuario[]
          : (usuarios || []);
      } else if (gestorLocal) {
        const base = [...equipeUsuarios, ...(logado ? [logado] : [])];
        const unique = Array.from(
          new Map(base.filter(Boolean).map((u) => [u.id, u])).values()
        );
        vendedoresDisponiveis = unique;
      } else if (isEditLocal) {
        vendedoresDisponiveis = logado?.company_id
          ? (usuarios || []).filter((u: any) => u.company_id === logado.company_id) as Usuario[]
          : (usuarios || []);
      } else if (isUsuarioVendedor(logado)) {
        vendedoresDisponiveis = [logado];
      }
      const vendedoresValidos = gestorLocal
        ? vendedoresDisponiveis
        : vendedoresDisponiveis.filter(isUsuarioVendedor);
      setVendedores(vendedoresValidos);

      // carregar parametros_comissao (company)
      const { data: params } = await supabase
        .from("parametros_comissao")
        .select("foco_valor")
        .eq("company_id", logado?.company_id || null)
        .maybeSingle();
      setParametros(params || null);

      if (vendedoresValidos.length === 0) {
        setErro(
          gestorLocal
            ? "Nenhum vendedor vinculado ao gestor."
            : "Nenhum vendedor do tipo VENDEDOR disponível."
        );
        return;
      }
      const initialVendedor =
        vendedoresValidos.find((v) => v.id === logado?.id) || vendedoresValidos[0];
      await carregarMetas(initialVendedor.id, logado);
      setVendedorSelecionado(initialVendedor.id);

    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados iniciais");
    } finally {
      setLoadingMeta(false);
    }
  }

  // =============================================
  // 2. CARREGAR METAS DO VENDEDOR SELECIONADO
  // =============================================
  async function carregarMetas(vendedor_id: string, usuarioLogado?: Usuario | null) {
    const isAdminLocal = can("Metas", "admin");
    const isEditLocal = can("Metas", "edit");

    const usuarioAtual = usuarioLogado ?? usuario;

    if (!usuarioAtual && !isAdminLocal && !isEditLocal) {
      setListaMetas([]);
      return;
    }

    // vendedor comum só pode ver as próprias metas
    if (!isAdminLocal && !isEditLocal && vendedor_id !== usuarioAtual?.id) {
      setListaMetas([]);
      return;
    }

    const { data } = await supabase
      .from("metas_vendedor")
      .select("*")
      .eq("vendedor_id", vendedor_id)
      .order("periodo", { ascending: false });

    const metas = (data || []) as Meta[];
    setListaMetas(metas);

    if (metas.length > 0) {
      const { data: det } = await supabase
        .from("metas_vendedor_produto")
        .select("meta_vendedor_id, produto_id, valor")
        .in(
          "meta_vendedor_id",
          metas.map((m) => m.id)
        );
      const map: Record<string, MetaProduto[]> = {};
      (det || []).forEach((d: any) => {
        if (!map[d.meta_vendedor_id]) map[d.meta_vendedor_id] = [];
        map[d.meta_vendedor_id].push(d as MetaProduto);
      });
      setDetalhesMetas(map);
    } else {
      setDetalhesMetas({});
    }
  }

  useEffect(() => {
    if (!loadingPerm && vendedorSelecionado) {
      carregarMetas(vendedorSelecionado);
    }
  }, [vendedorSelecionado, loadingPerm]);

  // =============================================
  // 3. PERFIL DE ACESSO
  // =============================================
  const isGestorRole = isUsuarioGestor(usuario);
  const isAdminRole = isUsuarioAdmin(usuario);
  const isVendedorOnly = isUsuarioVendedor(usuario) && !isGestorRole && !isAdminRole;

  const usuarioPodeEditar = !isVendedorOnly && (isAdmin || isEdit || isGestorRole);

  const mostrarSelectVendedor =
    !isVendedorOnly && (isAdmin || isEdit || isGestorRole) && vendedores.length > 1;

  // =============================================
  // 4. SALVAR / EDITAR META
  // =============================================
  function formatarMoeda(valor: string) {
    const somenteDigitos = valor.replace(/\D/g, "");
    if (!somenteDigitos) return "";
    const numero = Number(somenteDigitos) / 100;
    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function normalizarMoeda(valor: string) {
    if (!valor) return 0;
    // Se o valor for apenas dígitos, consideramos que está em centavos
    if (/^\d+$/.test(valor)) {
      return Number(valor) / 100;
    }
    const limpo = valor.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(limpo);
    return Number.isNaN(num) ? 0 : num;
  }

  function numeroParaRaw(valor: number) {
    if (valor === null || valor === undefined) return "";
    return Math.round(valor * 100).toString();
  }

  function totalMetaDiferenciada() {
    return metaProdutos.reduce((sum, item) => sum + normalizarMoeda(item.valor), 0);
  }

  function totalMetaEquipeDiferenciada() {
    return metaEquipeProdutos.reduce((sum, item) => sum + normalizarMoeda(item.valor), 0);
  }

  async function salvarMetaEquipe(e: React.FormEvent) {
    e.preventDefault();
    setErroEquipe(null);

    if (!usuario || !isGestorRole) {
      setErroEquipe("Apenas gestores podem definir metas gerais da equipe.");
      return;
    }

    const metaTotal = normalizarMoeda(metaEquipeGeral);
    if (!metaEquipeGeral || metaTotal <= 0) {
      setErroEquipe("Informe uma meta geral válida para a equipe.");
      return;
    }

    if (equipeIds.length === 0) {
      setErroEquipe("Nenhum vendedor vinculado ao gestor.");
      return;
    }

    const metaGestorNum = gestorParticipa ? normalizarMoeda(metaGestor) : 0;
    if (gestorParticipa && metaGestorNum <= 0) {
      setErroEquipe("Informe a meta do gestor para participar da meta geral.");
      return;
    }
    if (gestorParticipa && metaGestorNum > metaTotal) {
      setErroEquipe("A meta do gestor não pode ser maior que a meta geral.");
      return;
    }

    const totalDifEquipe = totalMetaEquipeDiferenciada();
    if (parametros?.foco_valor === "liquido" && totalDifEquipe <= 0) {
      setErroEquipe("Quando o foco é valor líquido, informe metas diferenciadas por produto.");
      return;
    }

    const restante = metaTotal - metaGestorNum;
    const divisor = equipeIds.length;
    if (divisor <= 0) {
      setErroEquipe("Nenhum vendedor válido para dividir a meta.");
      return;
    }
    const metaPorVendedor = restante / divisor;
    if (metaPorVendedor < 0) {
      setErroEquipe("A meta geral precisa ser maior que a meta do gestor.");
      return;
    }

    const periodoFinal = `${periodoEquipe}-01`;
    const idsParaMetas = gestorParticipa
      ? Array.from(new Set([usuario.id, ...equipeIds]))
      : [...equipeIds];
    const idsDistribuicao = [...equipeIds];
    const metaDifPorVendedor =
      idsDistribuicao.length > 0 ? totalDifEquipe / idsDistribuicao.length : 0;

    try {
      setSalvandoEquipe(true);

      const { data: metasExistentes, error: metasErr } = await supabase
        .from("metas_vendedor")
        .select("id, vendedor_id")
        .eq("periodo", periodoFinal)
        .in("vendedor_id", idsParaMetas);
      if (metasErr) throw metasErr;

      const mapExistentes = new Map<string, string>();
      (metasExistentes || []).forEach((m: any) => {
        if (m?.vendedor_id) mapExistentes.set(m.vendedor_id, m.id);
      });

      const updates: Promise<any>[] = [];
      const inserts: any[] = [];

      idsParaMetas.forEach((id) => {
        const metaValue =
          gestorParticipa && id === usuario.id ? metaGestorNum : metaPorVendedor;
        const metaDifValue =
          idsDistribuicao.includes(id) && totalDifEquipe > 0 ? metaDifPorVendedor : 0;
        const existingId = mapExistentes.get(id);
        if (existingId) {
          updates.push(
            supabase
              .from("metas_vendedor")
              .update({
                meta_geral: metaValue,
                meta_diferenciada: metaDifValue,
                ativo: ativoEquipe,
                scope: "vendedor",
              })
              .eq("id", existingId)
          );
        } else {
          inserts.push({
            vendedor_id: id,
            periodo: periodoFinal,
            meta_geral: metaValue,
            meta_diferenciada: metaDifValue,
            ativo: ativoEquipe,
            scope: "vendedor",
          });
        }
      });

      if (updates.length) {
        await Promise.all(updates);
      }
      if (inserts.length) {
        const { error: insertErr } = await supabase
          .from("metas_vendedor")
          .insert(inserts);
        if (insertErr) throw insertErr;
      }

      const { data: metasPeriodo } = await supabase
        .from("metas_vendedor")
        .select("id, vendedor_id")
        .eq("periodo", periodoFinal)
        .in("vendedor_id", idsParaMetas);
      const metaIdsMap: Record<string, string> = {};
      (metasPeriodo || []).forEach((m: any) => {
        if (m?.vendedor_id && m?.id) metaIdsMap[m.vendedor_id] = m.id;
      });
      const metaIdsParaLimpar = (metasPeriodo || [])
        .map((m: any) => m.id)
        .filter(Boolean);
      if (metaIdsParaLimpar.length > 0) {
        await supabase
          .from("metas_vendedor_produto")
          .delete()
          .in("meta_vendedor_id", metaIdsParaLimpar);
      }

      const linhasValidas = metaEquipeProdutos.filter(
        (p) => p.produto_id && normalizarMoeda(p.valor) > 0
      );
      if (linhasValidas.length > 0 && idsDistribuicao.length > 0) {
        const insertsProdutos: any[] = [];
        linhasValidas.forEach((linha) => {
          const valorTotalProduto = normalizarMoeda(linha.valor);
          const valorPorVendedor =
            idsDistribuicao.length > 0 ? valorTotalProduto / idsDistribuicao.length : 0;
          idsDistribuicao.forEach((vid) => {
            const metaId = metaIdsMap[vid];
            if (!metaId) return;
            insertsProdutos.push({
              meta_vendedor_id: metaId,
              produto_id: linha.produto_id,
              valor: valorPorVendedor,
            });
          });
        });
        if (insertsProdutos.length > 0) {
          const { error: prodErr } = await supabase
            .from("metas_vendedor_produto")
            .insert(insertsProdutos);
          if (prodErr) throw prodErr;
        }
      }

      await carregarMetas(vendedorSelecionado);
      setMetaEquipeGeral("");
      setMetaGestor("");
      setMetaEquipeProdutos([]);
      setGestorParticipa(false);
    } catch (e: any) {
      console.error(e);
      setErroEquipe("Erro ao salvar meta geral da equipe.");
    } finally {
      setSalvandoEquipe(false);
    }
  }

  async function salvarMeta(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const vendedorAtual = vendedores.find((v) => v.id === vendedorSelecionado);
    if (!metaGeral || !vendedorSelecionado || !vendedorAtual) {
      setErro("Meta geral e vendedor são obrigatórios.");
      return;
    }

    const selecaoGestor = isGestorRole && vendedorAtual.id === usuario?.id;
    if (!isUsuarioVendedor(vendedorAtual) && !selecaoGestor) {
      setErro("Selecione um vendedor com tipo VENDEDOR.");
      return;
    }

    // Validação com parâmetros (ex.: foco líquido → exigir meta diferenciada)
    const totalDif = totalMetaDiferenciada();

    const metaGeralNum = normalizarMoeda(metaGeral);
    const metaDifNum = totalDif;

    if (Number.isNaN(metaGeralNum)) {
      setErro("Meta geral inválida.");
      return;
    }

    // Se foco em valor líquido exigir diferenciada, garanta que há pelo menos uma linha válida
    if (parametros?.foco_valor === "liquido" && metaDifNum <= 0) {
      setErro("Quando o foco é valor líquido, informe metas diferenciadas por produto.");
      return;
    }

    const linhasValidas = metaProdutos.filter(
      (p) => p.produto_id && normalizarMoeda(p.valor) > 0
    );
    if (metaDifNum > 0 && linhasValidas.length === 0) {
      setErro("Adicione pelo menos um produto com valor para a meta diferenciada.");
      return;
    }

    try {
      setSalvando(true);

      const periodoFinal = `${periodo}-01`; // YYYY-MM-01

      const payloadBase = {
        vendedor_id: vendedorSelecionado,
        periodo: periodoFinal,
        meta_geral: metaGeralNum,
        meta_diferenciada: metaDifNum,
        ativo: ativoMeta,
        scope: "vendedor",
      } as Record<string, any>;

      let metaId = editId;

      if (editId) {
        const { error } = await supabase
          .from("metas_vendedor")
          .update(payloadBase)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("metas_vendedor")
          .insert(payloadBase)
          .select("id")
          .single();
        if (error) throw error;
        metaId = inserted.id;
      }

      // Sincronizar metas por produto
      const metaIdFinal = metaId!;
      await supabase
        .from("metas_vendedor_produto")
        .delete()
        .eq("meta_vendedor_id", metaIdFinal);

      if (linhasValidas.length > 0) {
        const detalhesInsert = linhasValidas.map((p) => ({
          meta_vendedor_id: metaIdFinal,
          produto_id: p.produto_id,
          valor: normalizarMoeda(p.valor),
        }));
        const { error: detError } = await supabase
          .from("metas_vendedor_produto")
          .insert(detalhesInsert);
        if (detError) throw detError;
      }

      await carregarMetas(vendedorSelecionado);

      limparFormulario();
    } catch (e: any) {
      console.error(e);
      setErro(e?.message ? `Erro ao salvar meta: ${e.message}` : "Erro ao salvar meta.");
    } finally {
      setSalvando(false);
    }
  }

  function limparFormulario() {
    setMetaGeral("");
    setMetaProdutos([]);
    setEditId(null);
    setAtivoMeta(true);
  }

  function abrirFormularioMeta() {
    limparFormulario();
    setMostrarFormularioMeta(true);
    setErro(null);
  }

  function fecharFormularioMeta() {
    limparFormulario();
    setMostrarFormularioMeta(false);
    setErro(null);
  }

  function iniciarEdicao(m: Meta) {
    setEditId(m.id);
    setPeriodo(m.periodo.slice(0, 7));
    setMetaGeral(numeroParaRaw(m.meta_geral));
    const detalhes = detalhesMetas[m.id] || [];
    if (detalhes.length > 0) {
      setMetaProdutos(
        detalhes.map((d) => ({
          produto_id: d.produto_id,
          valor: numeroParaRaw(d.valor),
        }))
      );
    } else {
      setMetaProdutos([]);
    }
    setAtivoMeta(m.ativo);
    setMostrarFormularioMeta(true);
    setErro(null);
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    try {
      const { error } = await supabase
        .from("metas_vendedor")
        .update({ ativo: !ativo })
        .eq("id", id);
      if (error) throw error;
      await carregarMetas(vendedorSelecionado);
    } catch (e) {
      setErro("Não foi possível alterar status da meta.");
    }
  }

  async function excluirMeta(id: string) {
    const { error } = await supabase
      .from("metas_vendedor")
      .delete()
      .eq("id", id);

    if (error) {
      setErro("Não foi possível excluir meta.");
      return;
    }

    await carregarMetas(vendedorSelecionado);
  }

  function solicitarExclusaoMeta(meta: Meta) {
    setMetaParaExcluir(meta);
  }

  async function confirmarExclusaoMeta() {
    if (!metaParaExcluir) return;
    await excluirMeta(metaParaExcluir.id);
    setMetaParaExcluir(null);
  }

  // =============================================
  // UI
  // =============================================

  if (loadingPerm || loadingMeta) return <LoadingUsuarioContext />;
  if (!podeVer) return <div>Acesso ao módulo de Metas bloqueado.</div>;
  if (isVendedorOnly) {
    return (
      <div className="card-base card-config">
        Metas são definidas pelo gestor da equipe.
      </div>
    );
  }

  const metasExibidas = listaMetas.slice(0, 5);
  const metaEquipeTotalNum = normalizarMoeda(metaEquipeGeral);
  const metaGestorNum = gestorParticipa ? normalizarMoeda(metaGestor) : 0;
  const equipeCount = equipeIds.length;
  const metaPorVendedor =
    equipeCount > 0 ? (metaEquipeTotalNum - metaGestorNum) / equipeCount : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6 metas-page">
      {erro && !mostrarFormularioMeta && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      {isGestorRole && (
        <div className="card-base card-blue mb-3">
          <h3 className="mb-2">Meta geral da equipe</h3>
          <p style={{ opacity: 0.8, marginBottom: 12 }}>
            Defina a meta total do período e deixe o sistema dividir entre os vendedores.
          </p>
          <form onSubmit={salvarMetaEquipe}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="form-group flex-1 min-w-[160px]">
                <label className="form-label">Período *</label>
                <input
                  type="month"
                  className="form-input w-full"
                  value={periodoEquipe}
                  onChange={(e) => setPeriodoEquipe(e.target.value)}
                />
              </div>

              <div className="form-group flex-1 min-w-[180px]">
                <label className="form-label">Meta geral (R$) *</label>
                <input
                  className="form-input"
                  type="text"
                  value={formatarMoeda(metaEquipeGeral)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setMetaEquipeGeral(raw);
                  }}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>

              <div className="form-group flex-1 min-w-[160px]">
                <label className="form-label">Gestor participa?</label>
                <select
                  className="form-select"
                  value={gestorParticipa ? "true" : "false"}
                  onChange={(e) => setGestorParticipa(e.target.value === "true")}
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </div>

              {gestorParticipa && (
                <div className="form-group flex-1 min-w-[180px]">
                  <label className="form-label">Meta do gestor (R$)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formatarMoeda(metaGestor)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setMetaGestor(raw);
                    }}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </div>
              )}

              <div className="form-group flex-1 min-w-[120px]">
                <label className="form-label">Ativa?</label>
                <select
                  className="form-select"
                  value={ativoEquipe ? "true" : "false"}
                  onChange={(e) => setAtivoEquipe(e.target.value === "true")}
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Metas diferenciadas por produto (opcional)</label>
              <div className="flex flex-col gap-2">
                {metaEquipeProdutos.map((mp, idx) => (
                  <div className="flex flex-col md:flex-row gap-2" key={idx}>
                    <div className="form-group flex-1 min-w-[160px]">
                      <label className="form-label">Produto</label>
                      <select
                        className="form-select"
                        value={mp.produto_id}
                        onChange={(e) => {
                          const copia = [...metaEquipeProdutos];
                          copia[idx] = { ...copia[idx], produto_id: e.target.value };
                          setMetaEquipeProdutos(copia);
                        }}
                      >
                        <option value="">Selecione</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group flex-1 min-w-[140px]">
                      <label className="form-label">Meta (R$)</label>
                      <input
                        className="form-input"
                        type="text"
                        inputMode="decimal"
                        value={formatarMoeda(mp.valor)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          const copia = [...metaEquipeProdutos];
                          copia[idx] = { ...copia[idx], valor: raw };
                          setMetaEquipeProdutos(copia);
                        }}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="form-group flex-none flex items-end">
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => {
                          setMetaEquipeProdutos(
                            metaEquipeProdutos.filter((_, i) => i !== idx)
                          );
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
                <div className="form-row mobile-stack" style={{ alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    onClick={() =>
                      setMetaEquipeProdutos([
                        ...metaEquipeProdutos,
                        { produto_id: "", valor: "" },
                      ])
                    }
                  >
                    + Adicionar produto
                  </button>
                  <div style={{ marginLeft: "auto", fontWeight: 600 }}>
                    Total diferenciada:{" "}
                    {totalMetaEquipeDiferenciada().toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
                {parametros?.foco_valor === "liquido" && (
                  <small style={{ color: "#f97316" }}>
                    Foco em valor líquido ativo: informe metas diferenciadas por produto.
                  </small>
                )}
              </div>
            </div>

            <div className="card-base card-config mt-3">
              <div style={{ fontWeight: 600 }}>
                Equipe: {equipeCount} vendedor(es)
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                Meta por vendedor:{" "}
                {Number.isFinite(metaPorVendedor)
                  ? metaPorVendedor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "—"}
              </div>
              {totalMetaEquipeDiferenciada() > 0 && (
                <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>
                  Meta diferenciada por vendedor:{" "}
                  {(equipeCount > 0
                    ? totalMetaEquipeDiferenciada() / equipeCount
                    : 0
                  ).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              )}
            </div>

            {erroEquipe && (
              <div className="card-base card-config mb-2 mt-2">
                <strong>{erroEquipe}</strong>
              </div>
            )}

            <div className="mobile-stack-buttons" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={salvandoEquipe}>
                {salvandoEquipe ? "Salvando..." : "Aplicar meta geral"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={`card-base card-blue mb-2${mostrarFormularioMeta ? " form-card" : ""}`}>
        {!mostrarFormularioMeta && (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-end">
            <h3 className="text-center sm:text-left">Metas cadastradas</h3>
            {usuarioPodeEditar && (
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={abrirFormularioMeta}
                disabled={mostrarFormularioMeta}
              >
                Adicionar meta
              </button>
            )}
          </div>
        )}
        {mostrarFormularioMeta && (
          <form onSubmit={salvarMeta}>
          <div className="flex flex-col md:flex-row gap-4">

            {mostrarSelectVendedor && (
              <div className="form-group flex-1 min-w-[180px]">
                <label className="form-label">Vendedor *</label>
                <select
                  className="form-select"
                  value={vendedorSelecionado}
                  onChange={(e) =>
                    setVendedorSelecionado(e.target.value)
                  }
                >
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome_completo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group flex-1 min-w-[180px]">
              <label className="form-label">Período *</label>
              <input
                type="month"
                className="form-input w-full"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
              />
            </div>

            <div className="form-group flex-1 min-w-[180px]">
              <label className="form-label">Meta Geral (R$) *</label>
              <input
                className="form-input"
                type="text"
                value={formatarMoeda(metaGeral)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setMetaGeral(raw);
                }}
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>

            <div className="form-group flex-1 min-w-[220px]">
              <label className="form-label">Metas diferenciadas por produto (opcional)</label>
              <div className="flex flex-col gap-2">
                {metaProdutos.map((mp, idx) => (
                  <div className="flex flex-col md:flex-row gap-2" key={idx}>
                    <div className="form-group flex-1 min-w-[140px]">
                      <label className="form-label">Produto</label>
                      <select
                        className="form-select"
                        value={mp.produto_id}
                        onChange={(e) => {
                          const copia = [...metaProdutos];
                          copia[idx] = { ...copia[idx], produto_id: e.target.value };
                          setMetaProdutos(copia);
                        }}
                      >
                        <option value="">Selecione</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group flex-1 min-w-[120px]">
                      <label className="form-label">Meta (R$)</label>
                      <input
                        className="form-input"
                        type="text"
                        inputMode="decimal"
                        value={formatarMoeda(mp.valor)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          const copia = [...metaProdutos];
                          copia[idx] = { ...copia[idx], valor: raw };
                          setMetaProdutos(copia);
                        }}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="form-group flex-none flex items-end">
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => {
                          setMetaProdutos(metaProdutos.filter((_, i) => i !== idx));
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
                <div className="form-row mobile-stack" style={{ alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    onClick={() =>
                      setMetaProdutos([...metaProdutos, { produto_id: "", valor: "" }])
                    }
                  >
                    + Adicionar produto
                  </button>
                  <div style={{ marginLeft: "auto", fontWeight: 600 }}>
                    Total diferenciada:{" "}
                    {totalMetaDiferenciada().toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
                {parametros?.foco_valor === "liquido" && (
                  <small style={{ color: "#f97316" }}>
                    Foco em valor líquido ativo: informe metas diferenciadas por produto.
                  </small>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ativa?</label>
              <select
                className="form-select"
                value={ativoMeta ? "true" : "false"}
                onChange={(e) => setAtivoMeta(e.target.value === "true")}
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
          </div>

          {erro && (
            <div className="card-base card-config mb-2">
              <strong>{erro}</strong>
            </div>
          )}

          {usuarioPodeEditar && (
            <div className="mobile-stack-buttons" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : editId
                  ? "Salvar alterações"
                  : "Salvar meta"}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={fecharFormularioMeta}
                disabled={salvando}
              >
                Cancelar
              </button>
            </div>
          )}
          </form>
        )}
      </div>

      {!mostrarFormularioMeta && (
        <div
          className="table-container overflow-x-auto"
          style={{ maxHeight: "65vh", overflowY: "auto" }}
        >
          <table className="table-default table-header-blue table-mobile-cards min-w-[880px]">
            <thead>
              <tr>
                <th>Período</th>
                <th>Meta Geral</th>
                <th>Meta Diferenciada</th>
                <th>Produtos</th>
                <th>Ativo</th>
                {usuarioPodeEditar && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {metasExibidas.length === 0 && (
                <tr>
                  <td colSpan={usuarioPodeEditar ? 6 : 5}>Nenhuma meta cadastrada.</td>
                </tr>
              )}

              {metasExibidas.map((m) => (
                <tr key={m.id}>
                  <td data-label="Período">{m.periodo.slice(0, 7)}</td>
                  <td data-label="Meta Geral">
                    {m.meta_geral.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td data-label="Meta Diferenciada">
                    {m.meta_diferenciada.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td data-label="Produtos">
                    {(detalhesMetas[m.id] || []).length === 0
                      ? "—"
                      : (detalhesMetas[m.id] || [])
                          .map((d) => {
                            const nome = produtos.find((p) => p.id === d.produto_id)?.nome || "Produto";
                            return `${nome}: ${d.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}`;
                          })
                          .join(" | ")}
                  </td>
                  <td data-label="Ativo">{m.ativo ? "Sim" : "Não"}</td>

                  {usuarioPodeEditar && (
                    <td className="th-actions" data-label="Ações">
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          title="Editar"
                          onClick={() => iniciarEdicao(m)}
                        >
                          ✏️
                        </button>

                        <button
                          className="btn-icon btn-danger"
                          title="Excluir"
                          onClick={() => solicitarExclusaoMeta(m)}
                        >
                          🗑️
                        </button>
                        <button
                          className="btn-icon"
                          title={m.ativo ? "Inativar" : "Ativar"}
                          onClick={() => toggleAtivo(m.id, m.ativo)}
                        >
                          {m.ativo ? "⏸️" : "▶️"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(metaParaExcluir)}
        title="Excluir meta"
        message={`Excluir a meta de ${metaParaExcluir?.periodo || "este período"}?`}
        confirmLabel="Excluir"
        confirmVariant="danger"
        onCancel={() => setMetaParaExcluir(null)}
        onConfirm={confirmarExclusaoMeta}
      />
    </div>
  );
}
