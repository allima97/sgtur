import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { MAPA_MODULOS } from "../config/modulos";
import {
  ensurePermissoes,
  getPermissaoFromCache,
  readPermissoesCache,
  subscribePermissoes,
  type Permissao,
  type PermissoesCache,
} from "./permissoesCache";

type PermissoesState = {
  cache: PermissoesCache | null;
  loading: boolean;
  ready: boolean;
  userId: string | null;
  userEmail: string;
};

const initialCache = null;
let state: PermissoesState = {
  cache: initialCache,
  loading: false,
  ready: Boolean(initialCache),
  userId: initialCache?.userId ?? null,
  userEmail: initialCache?.userEmail ?? "",
};
const hydrationSnapshot: PermissoesState = {
  cache: null,
  loading: false,
  ready: false,
  userId: null,
  userEmail: "",
};

const listeners = new Set<() => void>();
let subscribed = false;
let refreshPromise: Promise<PermissoesCache | null> | null = null;
let hydrationLocked = typeof window !== "undefined";
let hydrationUnlockScheduled = false;

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

const emit = () => {
  listeners.forEach((listener) => listener());
};

const syncHydrationSnapshot = () => {
  hydrationSnapshot.cache = null;
  hydrationSnapshot.loading = state.loading;
  hydrationSnapshot.ready = false;
  hydrationSnapshot.userId = null;
  hydrationSnapshot.userEmail = "";
};

const setState = (partial: Partial<PermissoesState>) => {
  state = { ...state, ...partial };
  syncHydrationSnapshot();
  emit();
};

const ensureSubscribed = () => {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  subscribePermissoes((cache) => {
    setState({
      cache,
      ready: true,
      userId: cache.userId ?? null,
      userEmail: cache.userEmail ?? "",
    });
  });
};

const scheduleHydrationUnlock = () => {
  if (!hydrationLocked || hydrationUnlockScheduled || typeof window === "undefined") return;
  hydrationUnlockScheduled = true;
  const unlock = () => {
    hydrationLocked = false;
    hydrationUnlockScheduled = false;
    emit();
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(unlock));
  } else {
    setTimeout(unlock, 0);
  }
};

export function getPermissoesSnapshot() {
  if (hydrationLocked && typeof window !== "undefined") {
    return hydrationSnapshot;
  }
  return state;
}

export function subscribePermissoesStore(listener: () => void) {
  ensureSubscribed();
  scheduleHydrationUnlock();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshPermissoes() {
  if (refreshPromise) return refreshPromise;
  setState({ loading: true });

  refreshPromise = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;
      const { data: userData } = sessionUser
        ? { data: { user: sessionUser } }
        : await supabase.auth.getUser();

      const user = userData?.user || sessionUser || null;
      if (!user) {
        setState({ cache: null, ready: true, userId: null, userEmail: "", loading: false });
        return null;
      }

      const cache = await ensurePermissoes(user.id, user.email);
      if (cache) {
        setState({
          cache,
          ready: true,
          userId: cache.userId ?? user.id,
          userEmail: cache.userEmail ?? user.email ?? "",
          loading: false,
        });
      } else {
        setState({
          ready: true,
          userId: user.id,
          userEmail: user.email ?? "",
          loading: false,
        });
      }

      return cache;
    } catch (err) {
      console.error("Erro ao carregar permissoes", err);
      setState({ loading: false, ready: true });
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export function usePermissoesStore() {
  const snapshot = useSyncExternalStore(
    subscribePermissoesStore,
    getPermissoesSnapshot,
    getPermissoesSnapshot
  );

  useEffect(() => {
    if (!snapshot.ready && !snapshot.loading) {
      setTimeout(() => {
        refreshPermissoes();
      }, 0);
    }
  }, [snapshot.ready, snapshot.loading]);

  const acessos = snapshot.cache?.acessos || {};
  const isAdmin = useMemo(
    () => Object.values(acessos).some((p) => p === "admin"),
    [acessos]
  );

  const canDb = useCallback(
    (moduloDb: string, min: Permissao = "view") => {
      if (isAdmin) return true;
      const key = String(moduloDb || "").toLowerCase();
      const perm = acessos[key] ?? "none";
      return permLevel(perm) >= permLevel(min);
    },
    [acessos, isAdmin]
  );

  const can = useCallback(
    (modulo: string, min: Permissao = "view") => {
      if (isAdmin) return true;
      const modDb = MAPA_MODULOS[modulo] || modulo;
      return canDb(modDb, min);
    },
    [canDb, isAdmin]
  );

  const getPermissao = useCallback(
    (modulo: string) =>
      getPermissaoFromCache(
        modulo,
        snapshot.userId ?? snapshot.cache?.userId ?? null,
        snapshot.cache
      ),
    [snapshot.cache, snapshot.userId]
  );

  return {
    ...snapshot,
    acessos,
    isAdmin,
    can,
    canDb,
    getPermissao,
    refresh: refreshPermissoes,
  };
}
