import { supabase } from "./supabase";
import { MODULO_ALIASES } from "../config/modulos";

export type Permissao =
  | "none"
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "admin";

export type PermissoesCache = {
  userId: string | null;
  acessos: Record<string, Permissao>;
  aliases: Record<string, string>;
  updatedAt: number;
  userEmail?: string;
};

type RegistroAcesso = {
  modulo: string | null;
  permissao: string | null;
  ativo: boolean | null;
};

const CACHE_KEY = "sgtur_menu_cache";
const CACHE_COOKIE_KEY = "sgtur_menu_cache";
const WINDOW_CACHE_KEY = "__sgturPermCache";
const WINDOW_PROMISE_KEY = "__sgturPermCachePromise";
const EVENT_NAME = "sgtur:permissoes-update";

const permLevel = (p: Permissao | undefined): number => {
  switch (p) {
    case "admin":
      return 5;
    case "delete":
      return 4;
    case "edit":
      return 3;
    case "create":
      return 2;
    case "view":
      return 1;
    default:
      return 0;
  }
};

const normalizePermissao = (value?: string | null): Permissao => {
  const perm = (value || "").toLowerCase();
  if (perm === "admin") return "admin";
  if (perm === "delete") return "delete";
  if (perm === "edit") return "edit";
  if (perm === "create") return "create";
  if (perm === "view") return "view";
  return "none";
};

const setPerm = (perms: Record<string, Permissao>, key: string, perm: Permissao) => {
  if (!key) return;
  const normalizedKey = key.toLowerCase();
  const atual = perms[normalizedKey] ?? "none";
  perms[normalizedKey] = permLevel(perm) > permLevel(atual) ? perm : atual;
};

const mergePerm = (perms: Record<string, Permissao>, modulo: string, perm: Permissao) => {
  const normalizedModulo = modulo.toLowerCase();
  setPerm(perms, normalizedModulo, perm);

  const alias = MODULO_ALIASES[normalizedModulo];
  if (alias) {
    setPerm(perms, alias, perm);
  }
};

const buildPermissoes = (rows: RegistroAcesso[]) => {
  const perms: Record<string, Permissao> = {};

  rows.forEach((registro) => {
    const modulo = String(registro.modulo || "").toLowerCase();
    if (!modulo) return;

    const permissaoNormalizada = normalizePermissao(registro.permissao);
    const finalPerm = registro.ativo ? permissaoNormalizada : "none";
    mergePerm(perms, modulo, finalPerm);
  });

  return perms;
};

const setWindowCache = (cache: PermissoesCache) => {
  try {
    (window as any)[WINDOW_CACHE_KEY] = cache;
  } catch {}
};

export function readPermissoesCache(): PermissoesCache | null {
  if (typeof window === "undefined") return null;

  const winCache = (window as any)[WINDOW_CACHE_KEY];
  if (winCache && typeof winCache === "object") {
    return winCache as PermissoesCache;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PermissoesCache;
    if (parsed && !parsed.aliases) {
      parsed.aliases = MODULO_ALIASES;
    }
    if (parsed) setWindowCache(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function persistPermissoesCache(cache: PermissoesCache) {
  if (typeof window === "undefined") return;

  const payload = {
    ...cache,
    aliases: cache.aliases || MODULO_ALIASES,
  };

  const cookiePayload = {
    userId: cache.userId,
    acessos: cache.acessos,
    updatedAt: cache.updatedAt,
    userEmail: cache.userEmail,
  };

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}

  try {
    (window as any)[WINDOW_CACHE_KEY] = payload;
  } catch {}

  try {
    const encoded = encodeURIComponent(JSON.stringify(cookiePayload));
    document.cookie = `${CACHE_COOKIE_KEY}=${encoded}; path=/; max-age=2592000; samesite=lax`;
  } catch {}

  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
  } catch {}
}

export function subscribePermissoes(callback: (cache: PermissoesCache) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (detail && typeof detail === "object") {
      callback(detail as PermissoesCache);
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function getPermissaoFromCache(
  modulo: string,
  userId?: string | null,
  cache?: PermissoesCache | null
) {
  if (!modulo || !userId) return null;

  const stored = cache ?? readPermissoesCache();
  if (!stored || stored.userId !== userId) return null;

  const key = modulo.trim().toLowerCase();
  if (!key) return null;

  const aliases = stored.aliases || MODULO_ALIASES;
  const acessos = stored.acessos || {};
  const mappedKey = aliases[key];
  const rawPerm = (mappedKey && acessos[mappedKey]) || acessos[key];
  if (rawPerm == null) return null;

  const permissao = normalizePermissao(String(rawPerm));
  return {
    permissao,
    ativo: permissao !== "none",
  };
}

export async function ensurePermissoes(userId: string, userEmail?: string | null) {
  if (typeof window === "undefined") return null;
  if (!userId) return null;

  const cached = readPermissoesCache();
  if (cached && cached.userId === userId) {
    return cached;
  }

  const existing = (window as any)[WINDOW_PROMISE_KEY] as
    | { userId?: string; promise?: Promise<PermissoesCache | null> }
    | undefined;

  if (existing?.userId === userId && existing.promise) {
    return await existing.promise;
  }

  const promise = (async () => {
    const { data, error } = await supabase
      .from("modulo_acesso")
      .select("modulo, permissao, ativo")
      .eq("usuario_id", userId);

    if (error) {
      console.error("Erro ao carregar permissoes", error);
      return null;
    }

    const perms = buildPermissoes((data || []) as RegistroAcesso[]);
    const cachePayload: PermissoesCache = {
      userId,
      acessos: perms,
      aliases: MODULO_ALIASES,
      updatedAt: Date.now(),
      userEmail: userEmail ? userEmail.toLowerCase() : cached?.userEmail,
    };

    persistPermissoesCache(cachePayload);
    return cachePayload;
  })();

  try {
    (window as any)[WINDOW_PROMISE_KEY] = { userId, promise };
  } catch {}

  try {
    return await promise;
  } finally {
    try {
      const current = (window as any)[WINDOW_PROMISE_KEY];
      if (current?.promise === promise) {
        delete (window as any)[WINDOW_PROMISE_KEY];
      }
    } catch {}
  }
}
