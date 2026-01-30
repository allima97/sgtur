import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UserWithType = {
  id: string;
  user_type_id: string;
  user_types?: {
    name: string;
  } | null;
};

const DashboardRouterIsland: React.FC = () => {
  const [mensagem, setMensagem] = useState("Verificando permissão e redirecionando...");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function decidirRota() {
      try {
        setErro(null);
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = userData?.user;
        if (!user) {
          setMensagem("Nenhum usuário autenticado. Faça login para continuar.");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("id, user_type_id, user_types(name)")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setMensagem("Usuário sem tipo cadastrado. Direcionando para dashboard geral.");
          window.location.href = "/dashboard/geral";
          return;
        }

        const typed = data as UserWithType;
        const tipoRaw =
          typed.user_types?.name ||
          (user.user_metadata as any)?.tipo_usuario ||
          (user.user_metadata as any)?.role ||
          "";
        const tipoNorm = tipoRaw.trim().toUpperCase();

        if (tipoNorm.includes("ADMIN")) {
          window.location.href = "/dashboard/admin";
          return;
        }

        if (tipoNorm.includes("GESTOR")) {
          window.location.href = "/dashboard/gestor";
          return;
        }

        window.location.href = "/dashboard";

        window.location.href = "/dashboard/geral";
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao decidir dashboard inicial. Indo para dashboard geral.");
        window.location.href = "/dashboard/geral";
      }
    }

    decidirRota();
  }, []);

  return (
    <div style={{ padding: "24px", fontSize: "0.95rem" }}>
      <h2 style={{ marginBottom: 8 }}>Carregando seu dashboard...</h2>
      <p>{mensagem}</p>
      {erro && (
        <p style={{ marginTop: 8, color: "#b91c1c" }}>
          {erro}
        </p>
      )}
    </div>
  );
};

export default DashboardRouterIsland;
