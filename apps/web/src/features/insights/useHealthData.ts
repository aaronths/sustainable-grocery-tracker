import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { ApiError } from "@/api/client";
import { getHealthRecommendations, getMacroStats } from "@/api/resources";
import type { DietFlag, HealthRecommendation, MacroStatsResponse } from "@/api/types";

export type HealthData = {
  macros: MacroStatsResponse;
  dietFlags: DietFlag[];
  allergyAlerts: string[];
  recommendations: HealthRecommendation[];
};

type Status = "loading" | "error" | "ready";

export function useHealthData() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (background: boolean) => {
    if (background) setRefreshing(true);
    try {
      const [macros, health] = await Promise.all([getMacroStats(), getHealthRecommendations()]);
      setData({
        macros,
        dietFlags: health.dietFlags,
        allergyAlerts: health.allergyAlerts,
        recommendations: health.recommendations,
      });
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
