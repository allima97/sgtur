import { supabaseServer } from "../../../lib/supabaseServer";

type Payload = {
  email?: string | null;
};

export async function POST({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as Payload;
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({ error: "Informe um e-mail válido." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabaseServer.auth.admin.getUserByEmail(email);

    if (error) {
      if (error.status === 404) {
        return new Response(JSON.stringify({ exists: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.error("[check-email] falha ao buscar registro", error);
      return new Response(JSON.stringify({ error: "Não foi possível verificar o e-mail." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        exists: Boolean(data?.user),
        userId: data?.user?.id ?? null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[check-email] erro inesperado", error);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
