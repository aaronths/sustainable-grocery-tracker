import { useEffect, useState } from "react";

import { ApiError } from "@/api/client";
import { getWeeks } from "@/api/resources";
import type { Week } from "@/api/types";

type Status = "loading" | "error" | "ready";

// Newest-first closed weeks, the same order GET /weeks returns.
export function useWeekHistory() {
  const [status, setStatus] = useState<Status>("loading");
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWeeks(52)
      .then((result) => {
        if (cancelled) return;
        setWeeks(result);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load past weeks");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, weeks, error };
}
