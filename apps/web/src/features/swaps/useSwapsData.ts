import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { ApiError } from "@/api/client";
import { commitSwap, getCurrentChallenge, getDashboard, getSwaps } from "@/api/resources";
import type { Challenge, Swap } from "@/api/types";

export type SwapsData = {
  hero: Swap | null;
  rest: Swap[];
  challenge: Challenge | null;
  daysLeft: number;
};

type Status = "loading" | "error" | "ready";

export function useSwapsData() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<SwapsData | null>(null);
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
      setData({ hero: swaps[0] ?? null, rest: swaps.slice(1), challenge, daysLeft: dashboard.daysLeft });
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

  const commit = useCallback(async (id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const patch = (s: Swap) => (s.id === id ? { ...s, committed: true } : s);
      return {
        ...prev,
        hero: prev.hero ? patch(prev.hero) : prev.hero,
        rest: prev.rest.map(patch),
      };
    });
    try {
      await commitSwap(id);
    } catch {
      fetchAll(true);
    }
  }, [fetchAll]);

  return { status, data, error, refreshing, refetch: () => fetchAll(true), commit };
}
