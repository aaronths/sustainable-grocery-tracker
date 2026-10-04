import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { ApiError } from "@/api/client";
import { getCurrentChallenge, getDashboard, getSwaps } from "@/api/resources";
import type { Challenge, Swap } from "@/api/types";

export type ActionsData = {
  hero: Swap | null;
  rest: Swap[];
  challenge: Challenge | null;
  daysLeft: number;
};

type Status = "loading" | "error" | "ready";

export function useActionsData() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<ActionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (background: boolean) => {
    if (background) setRefreshing(true);
    try {
      const [swaps, challenge, dashboard] = await Promise.all([
        getSwaps(),
        getCurrentChallenge(),
        getDashboard(),
      ]);
      setData({ hero: swaps.hero, rest: swaps.ideas, challenge, daysLeft: dashboard.daysLeft });
      setStatus("ready");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server");
      setStatus((prev) => (prev === "ready" ? prev : "error"));
    } finally {
      if (background) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      fetchAll(true);
    }, [fetchAll]),
  );

  const setChallenge = useCallback((challenge: Challenge) => {
    setData((prev) => (prev ? { ...prev, challenge } : prev));
  }, []);

  return { status, data, error, refreshing, refetch: () => fetchAll(true), setChallenge };
}
