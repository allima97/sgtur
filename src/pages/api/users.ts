import { supabaseServer } from "../../lib/supabaseServer";

type BodyPayload = {
  id?: string | null;
  email?: string | null;
  user_type_id?: string | null;
  nome_completo?: string | null;
  uso_individual?: boolean | null;
  company_id?: string | null;
  active?: boolean | null;
  created_by_gestor?: boolean | null;
};

export async function POST({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as BodyPayload;
    const userId = body.id?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!userId || !email) {
      return new Response("Id e e-mail são obrigatórios.", { status: 400 });
    }

    const payload = {
      id: userId,
      email,
      user_type_id: body.user_type_id ?? null,
      nome_completo: body.nome_completo ?? null,
      uso_individual:
        typeof body.uso_individual === "boolean" ? body.uso_individual : null,
      company_id: body.company_id ?? null,
      active: body.active ?? true,
      created_by_gestor: body.created_by_gestor ?? false,
    };

    const { error } = await supabaseServer.from("users").upsert(payload);

    if (error) {
      return new Response(`Falha ao persistir usuário: ${error.message}`, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (error: any) {
    return new Response(`Erro interno: ${error?.message ?? error}`, { status: 500 });
  }
}
