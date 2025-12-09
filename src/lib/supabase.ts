import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseProjectRef =
  supabaseUrl?.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? "";
const supabaseCookieName = supabaseProjectRef
  ? `sb-${supabaseProjectRef}-auth-token`
  : "sb-auth-token";

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && "PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "PUBLIC_SUPABASE_ANON_KEY",
  ]
    .filter(Boolean)
    .join(", ");

  const msg = `Faltam variáveis de ambiente: ${missing}. Configure-as no Cloudflare Pages (Settings → Environment Variables) ou crie um .env.local com esses nomes. Consulte /test-env para validar.`;

  // Em dev, logar para deixar explícito.
  if (import.meta.env.MODE !== "production") {
    console.error(msg);
  }

  throw new Error(msg);
}

// Use the SSR helper so auth sessions are stored in cookies, allowing
// middleware (createServerClient) to read the session and avoid redirect loops.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    name: supabaseCookieName,
    path: "/",
    sameSite: "lax",
  },
});
