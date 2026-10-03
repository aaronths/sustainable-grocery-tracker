import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/api/client";
import { deleteReceipt, getReceipts } from "@/api/resources";
import type { Receipt } from "@/api/types";

type Status = "loading" | "error" | "ready";

export function useReceiptsData(enabled: boolean, onChanged?: () => void) {
  const [status, setStatus] = useState<Status>("loading");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setStatus("loading");
    try {
      const all = await getReceipts();
      all.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      setReceipts(all);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (enabled) fetchAll();
  }, [enabled, fetchAll]);

  const remove = useCallback(
    async (id: string) => {
      setDeletingId(id);
      const prev = receipts;
      setReceipts((current) => current.filter((r) => r.id !== id));
      try {
        await deleteReceipt(id);
        onChanged?.();
      } catch (err) {
        setReceipts(prev);
        setError(err instanceof ApiError ? err.message : "Couldn't delete that receipt");
      } finally {
        setDeletingId(null);
      }
    },
    [receipts, onChanged],
  );

  return { status, receipts, error, deletingId, refetch: fetchAll, remove };
}
