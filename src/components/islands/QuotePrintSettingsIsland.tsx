import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { registrarLog } from "../../lib/logs";

type QuotePrintSettings = {
  id?: string;
  owner_user_id?: string | null;
  company_id?: string | null;
  logo_url?: string | null;
  logo_path?: string | null;
  consultor_nome?: string;
  filial_nome?: string;
  endereco_linha1?: string;
  endereco_linha2?: string;
  endereco_linha3?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  rodape_texto?: string;
};

const DEFAULT_FOOTER =
  "Precos em real (R$) convertido ao cambio do dia sujeito a alteracao e disponibilidade da tarifa.\n" +
  "Valor da crianca valido somente quando acompanhada de dois adultos pagantes no mesmo apartamento.\n" +
  "Este orcamento e apenas uma tomada de preco.\n" +
  "Os servicos citados nao estao reservados; a compra somente podera ser confirmada apos a confirmacao dos fornecedores.\n" +
  "Este orcamento foi feito com base na menor tarifa para os servicos solicitados, podendo sofrer alteracao devido a disponibilidade de lugares no ato da compra.\n" +
  "As regras de cancelamento de cada produto podem ser consultadas por meio do link do QR Code.";

const EMPTY_SETTINGS: QuotePrintSettings = {
  consultor_nome: "",
  filial_nome: "",
  endereco_linha1: "",
  endereco_linha2: "",
  endereco_linha3: "",
  telefone: "",
  whatsapp: "",
  email: "",
  rodape_texto: DEFAULT_FOOTER,
};

const LOGO_BUCKET = "quotes";

function getFileExtension(file: File) {
  const name = file?.name || "";
  const match = name.match(/\.([a-z0-9]+)$/i);
  if (match?.[1]) return match[1].toLowerCase();
  if (file.type.startsWith("image/")) return file.type.split("/")[1] || "png";
  return "png";
}

function extractStoragePath(value?: string | null) {
  if (!value) return null;
  const marker = "/quotes/";
  const index = value.indexOf(marker);
  if (index === -1) return null;
  return value.slice(index + marker.length);
}

export default function QuotePrintSettingsIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Parametros");
  const podeEditar = permissao === "admin" || permissao === "edit" || permissao === "delete";
  const bloqueado = !ativo || !podeEditar;

  const [settings, setSettings] = useState<QuotePrintSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function carregar() {
      setLoading(true);
      setErro(null);
      setSucesso(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          setErro("Usuario nao autenticado.");
          return;
        }

        const { data: userRow, error: userErr } = await supabase
          .from("users")
          .select("company_id, nome_completo, email")
          .eq("id", userId)
          .maybeSingle();
        if (userErr) throw userErr;

        const { data, error } = await supabase
          .from("quote_print_settings")
          .select("*")
          .eq("owner_user_id", userId)
          .maybeSingle();
        if (error) throw error;

        if (!active) return;

        if (data) {
          const logoPath = data.logo_path || extractStoragePath(data.logo_url);
          const previewUrl = logoPath
            ? (await supabase.storage.from(LOGO_BUCKET).createSignedUrl(logoPath, 3600)).data
                ?.signedUrl || data.logo_url
            : data.logo_url;
          if (!active) return;
          setSettings({
            id: data.id,
            owner_user_id: data.owner_user_id,
            company_id: data.company_id,
            logo_url: data.logo_url,
            logo_path: logoPath,
            consultor_nome: data.consultor_nome || userRow?.nome_completo || "",
            filial_nome: data.filial_nome || "",
            endereco_linha1: data.endereco_linha1 || "",
            endereco_linha2: data.endereco_linha2 || "",
            endereco_linha3: data.endereco_linha3 || "",
            telefone: data.telefone || "",
            whatsapp: data.whatsapp || "",
            email: data.email || userRow?.email || "",
            rodape_texto: data.rodape_texto || DEFAULT_FOOTER,
          });
          setLogoPreview(previewUrl || null);
        } else {
          setSettings({
            ...EMPTY_SETTINGS,
            owner_user_id: userId,
            company_id: userRow?.company_id || null,
            consultor_nome: userRow?.nome_completo || "",
            email: userRow?.email || "",
          });
        }
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar parametros do orcamento.");
      } finally {
        if (active) setLoading(false);
      }
    }

    carregar();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  async function uploadLogo(userId: string) {
    if (!logoFile) {
      return {
        url: settings.logo_url || null,
        path: settings.logo_path || extractStoragePath(settings.logo_url) || null,
      };
    }
    const ext = getFileExtension(logoFile);
    const path = `branding/${userId}/logo.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, logoFile, {
        upsert: true,
        contentType: logoFile.type || "image/png",
        cacheControl: "3600",
      });
    if (uploadErr) throw uploadErr;
    const publicUrl = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
    return { url: publicUrl || null, path };
  }

  async function salvar() {
    if (bloqueado) return;
    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuario nao autenticado.");

      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle();
      if (userErr) throw userErr;

      const logoInfo = await uploadLogo(userId);

      const payload = {
        owner_user_id: userId,
        company_id: userRow?.company_id || null,
        logo_url: logoInfo.url,
        logo_path: logoInfo.path,
        consultor_nome: settings.consultor_nome || "",
        filial_nome: settings.filial_nome || "",
        endereco_linha1: settings.endereco_linha1 || "",
        endereco_linha2: settings.endereco_linha2 || "",
        endereco_linha3: settings.endereco_linha3 || "",
        telefone: settings.telefone || "",
        whatsapp: settings.whatsapp || "",
        email: settings.email || "",
        rodape_texto: settings.rodape_texto || "",
      };

      const { error } = await supabase
        .from("quote_print_settings")
        .upsert(payload, { onConflict: "owner_user_id" });
      if (error) throw error;

      if (logoInfo.path) {
        const signed = await supabase.storage
          .from(LOGO_BUCKET)
          .createSignedUrl(logoInfo.path, 3600);
        setLogoPreview(signed.data?.signedUrl || logoInfo.url || null);
      } else {
        setLogoPreview(logoInfo.url || null);
      }

      setSettings((prev) => ({
        ...prev,
        logo_url: logoInfo.url,
        logo_path: logoInfo.path,
      }));

      await registrarLog({
        user_id: userId,
        acao: "quote_print_settings_salvos",
        modulo: "Parametros",
        detalhes: payload,
      });

      setSucesso("Parametros salvos com sucesso.");
      setLogoFile(null);
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar parametros do orcamento.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading || loadingPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!ativo) {
    return <div>Acesso ao modulo de parametros bloqueado.</div>;
  }

  return (
    <div className="card-base">
      <h2 className="card-title">Parametros do Orcamento (PDF)</h2>

      {erro && <div className="auth-error">{erro}</div>}
      {sucesso && <div className="auth-success">{sucesso}</div>}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Logo</label>
          <input
            className="form-input"
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            disabled={bloqueado}
          />
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Logo do orcamento"
              style={{ marginTop: 8, maxHeight: 80, objectFit: "contain" }}
            />
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Consultor</label>
          <input
            className="form-input"
            value={settings.consultor_nome || ""}
            onChange={(e) => setSettings((p) => ({ ...p, consultor_nome: e.target.value }))}
            disabled={bloqueado}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Filial</label>
          <input
            className="form-input"
            value={settings.filial_nome || ""}
            onChange={(e) => setSettings((p) => ({ ...p, filial_nome: e.target.value }))}
            disabled={bloqueado}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Endereco (linha 1)</label>
          <input
            className="form-input"
            value={settings.endereco_linha1 || ""}
            onChange={(e) => setSettings((p) => ({ ...p, endereco_linha1: e.target.value }))}
            disabled={bloqueado}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Endereco (linha 2)</label>
          <input
            className="form-input"
            value={settings.endereco_linha2 || ""}
            onChange={(e) => setSettings((p) => ({ ...p, endereco_linha2: e.target.value }))}
            disabled={bloqueado}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Endereco (linha 3)</label>
          <input
            className="form-input"
            value={settings.endereco_linha3 || ""}
            onChange={(e) => setSettings((p) => ({ ...p, endereco_linha3: e.target.value }))}
            disabled={bloqueado}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Telefone (fixo)</label>
          <input
            className="form-input"
            value={settings.telefone || ""}
            onChange={(e) => setSettings((p) => ({ ...p, telefone: e.target.value }))}
            disabled={bloqueado}
          />
        </div>
        <div className="form-group">
          <label className="form-label">WhatsApp</label>
          <input
            className="form-input"
            value={settings.whatsapp || ""}
            onChange={(e) => setSettings((p) => ({ ...p, whatsapp: e.target.value }))}
            disabled={bloqueado}
          />
        </div>
        <div className="form-group">
          <label className="form-label">E-mail</label>
          <input
            className="form-input"
            value={settings.email || ""}
            onChange={(e) => setSettings((p) => ({ ...p, email: e.target.value }))}
            disabled={bloqueado}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Rodape (informacoes importantes)</label>
        <textarea
          className="form-input"
          rows={6}
          value={settings.rodape_texto || ""}
          onChange={(e) => setSettings((p) => ({ ...p, rodape_texto: e.target.value }))}
          disabled={bloqueado}
        />
        <small style={{ color: "#64748b" }}>
          Use quebras de linha para cada item.
        </small>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button className="btn btn-primary" type="button" onClick={salvar} disabled={salvando || bloqueado}>
          {salvando ? "Salvando..." : "Salvar parametros"}
        </button>
      </div>
    </div>
  );
}
