import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { ApiError } from "@/api/client";
import { getCategoryStats, getWeeks } from "@/api/resources";
import type { CategoryStat, Week } from "@/api/types";
import { round1 } from "@/lib/scoring";

export type StatsData = {
  weeksOldestFirst: Week[];
  bestWeekKg: number;
  avg12wkKg: number;
  vsFirstWeekPct: number;
  categories: Array<{ group: CategoryStat["group"]; avgKgCo2e: number; pct: number }>;
};

type Status = "loading" | "error" | "ready";

function deriveStatsData(weeksNewestFirst: Week[], categoryStats: CategoryStat[]): StatsData {
  const weeksOldestFirst = [...weeksNewestFirst].reverse();
  const totals = weeksOldestFirst.map((w) => w.totalKg);
  const bestWeekKg = Math.min(...totals);
  const avg12wkKg = round1(totals.reduce((sum, t) => sum + t, 0) / totals.length);
  const first = weeksOldestFirst[0];
  const last = weeksOldestFirst[weeksOldestFirst.length - 1];
  const vsFirstWeekPct = round1(((last.totalKg - first.totalKg) / first.totalKg) * 100);

  const sumAvg = categoryStats.reduce((sum, c) => sum + c.avgKgCo2e, 0);
  const categories = [...categoryStats]
    .sort((a, b) => b.avgKgCo2e - a.avgKgCo2e)
    .map((c) => ({ group: c.group, avgKgCo2e: c.avgKgCo2e, pct: Math.round((c.avgKgCo2e / sumAvg) * 100) }));

  return { weeksOldestFirst, bestWeekKg, avg12wkKg, vsFirstWeekPct, categories };
}

export function useStatsData() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (background: boolean) => {
    if (background) setRefreshing(true);
    try {
      const [weeks, categoryStats] = await Promise.all([getWeeks(12), getCategoryStats(12)]);
      setData(deriveStatsData(weeks, categoryStats));
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

  return { status, data, error, refreshing, refetch: () => fetchAll(true) };
}
