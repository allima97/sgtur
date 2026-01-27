import { useCallback, useState } from "react";
import { supabase } from "./supabase";

type OrderBy = {
  column: string;
  ascending?: boolean;
};

type LoadOptions = {
  select?: string;
  order?: OrderBy;
  limit?: number;
  filter?: (query: any) => any;
  fetcher?: () => Promise<any[]>;
  errorMessage?: string;
};

type MutationOptions = {
  idColumn?: string;
  errorMessage?: string;
  select?: string;
  onConflict?: string;
};

type UseCrudResourceConfig<T> = {
  table: string;
  select?: string;
  mapData?: (rows: any[]) => T[];
};

type MutationResult<TData = unknown> = {
  error: unknown | null;
  data?: TData | null;
};

export function useCrudResource<T>({ table, select, mapData }: UseCrudResourceConfig<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options: LoadOptions = {}): Promise<MutationResult> => {
      setLoading(true);
      setError(null);

      try {
        if (options.fetcher) {
          const rows = await options.fetcher();
          setItems(mapData ? mapData(rows) : (rows as T[]));
          return { error: null };
        }

        let query = supabase
          .from(table)
          .select(options.select || select || "*");

        if (options.filter) {
          query = options.filter(query);
        }

        if (options.order) {
          query = query.order(options.order.column, {
            ascending: options.order.ascending ?? true,
          });
        }

        if (typeof options.limit === "number") {
          query = query.limit(options.limit);
        }

        const { data, error: queryError } = await query;
        if (queryError) {
          setError(options.errorMessage || "Erro ao carregar registros.");
          return { error: queryError };
        }

        const rows = (data || []) as any[];
        setItems(mapData ? mapData(rows) : (rows as T[]));
        return { error: null };
      } catch (err) {
        setError(options.errorMessage || "Erro ao carregar registros.");
        return { error: err };
      } finally {
        setLoading(false);
      }
    },
    [mapData, select, table]
  );

  const create = useCallback(
    async (payload: Record<string, any>, options: MutationOptions = {}): Promise<MutationResult> => {
      setSaving(true);
      setError(null);
      try {
        let query = supabase.from(table).insert(payload);
        if (options.select) {
          const { data, error: queryError } = await query.select(options.select).single();
          if (queryError) {
            setError(options.errorMessage || "Erro ao salvar registro.");
            return { error: queryError };
          }
          return { error: null, data };
        }
        const { error: queryError } = await query;
        if (queryError) {
          setError(options.errorMessage || "Erro ao salvar registro.");
          return { error: queryError };
        }
        return { error: null };
      } catch (err) {
        setError(options.errorMessage || "Erro ao salvar registro.");
        return { error: err };
      } finally {
        setSaving(false);
      }
    },
    [table]
  );

  const update = useCallback(
    async (
      id: string | number,
      payload: Record<string, any>,
      options: MutationOptions = {}
    ): Promise<MutationResult> => {
      setSaving(true);
      setError(null);
      try {
        const column = options.idColumn || "id";
        let query = supabase.from(table).update(payload).eq(column, id);
        if (options.select) {
          const { data, error: queryError } = await query.select(options.select).single();
          if (queryError) {
            setError(options.errorMessage || "Erro ao salvar registro.");
            return { error: queryError };
          }
          return { error: null, data };
        }
        const { error: queryError } = await query;
        if (queryError) {
          setError(options.errorMessage || "Erro ao salvar registro.");
          return { error: queryError };
        }
        return { error: null };
      } catch (err) {
        setError(options.errorMessage || "Erro ao salvar registro.");
        return { error: err };
      } finally {
        setSaving(false);
      }
    },
    [table]
  );

  const remove = useCallback(
    async (id: string | number, options: MutationOptions = {}): Promise<MutationResult> => {
      setDeletingId(id);
      setError(null);
      try {
        const column = options.idColumn || "id";
        const { error: queryError } = await supabase
          .from(table)
          .delete()
          .eq(column, id);
        if (queryError) {
          setError(options.errorMessage || "Erro ao excluir registro.");
          return { error: queryError };
        }
        return { error: null };
      } catch (err) {
        setError(options.errorMessage || "Erro ao excluir registro.");
        return { error: err };
      } finally {
        setDeletingId(null);
      }
    },
    [table]
  );

  const upsert = useCallback(
    async (payload: Record<string, any>, options: MutationOptions = {}): Promise<MutationResult> => {
      setSaving(true);
      setError(null);
      try {
        let query = supabase
          .from(table)
          .upsert(payload, options.onConflict ? { onConflict: options.onConflict } : undefined);
        if (options.select) {
          const { data, error: queryError } = await query.select(options.select).single();
          if (queryError) {
            setError(options.errorMessage || "Erro ao salvar registro.");
            return { error: queryError };
          }
          return { error: null, data };
        }
        const { error: queryError } = await query;
        if (queryError) {
          setError(options.errorMessage || "Erro ao salvar registro.");
          return { error: queryError };
        }
        return { error: null };
      } catch (err) {
        setError(options.errorMessage || "Erro ao salvar registro.");
        return { error: err };
      } finally {
        setSaving(false);
      }
    },
    [table]
  );

  return {
    items,
    setItems,
    loading,
    saving,
    deletingId,
    error,
    setError,
    load,
    create,
    update,
    upsert,
    remove,
  };
}
