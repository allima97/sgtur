import { supabaseServer } from "../../lib/supabaseServer";

type BodyPayload = {
  id?: string | null;
  email?: string | null;
};

export async function POST({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as BodyPayload;
    const userId = body.id?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!userId || !email) {
      return new Response("Id e e-mail são obrigatórios.", { status: 400 });
    }

    const { error } = await supabaseServer
      .from("users")
      .upsert({
        id: userId,
        email,
        nome_completo: null,
        uso_individual: null,
      });

    if (error) {
      return new Response(`Falha ao persistir usuário: ${error.message}`, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (error: any) {
    return new Response(`Erro interno: ${error?.message ?? error}`, { status: 500 });
  }
}
