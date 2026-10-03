import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { ApiError } from "@/api/client";
import { getDashboard, getOffsets, postOffset, postOffsetQuote } from "@/api/resources";
import type { DashboardResponse, OffsetQuote } from "@/api/types";

export type HomeData = {
  dashboard: DashboardResponse;
  quote: OffsetQuote | null;
  quoteError: string | null;
  offsetPurchased: boolean;
};

type Status = "loading" | "error" | "ready";

export function useHomeData() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fetchAll = useCallback(async (background: boolean) => {
    if (background) setRefreshing(true);
    try {
      const dashboard = await getDashboard();

      let quote: OffsetQuote | null = null;
      let quoteError: string | null = null;
      let offsetPurchased = false;

      if (dashboard.status === "over") {
        const history = await getOffsets();
        offsetPurchased = history.offsets.some((o) => o.weekId === dashboard.weekId);
        if (!offsetPurchased) {
          try {
            quote = await postOffsetQuote();
          } catch (err) {
            quoteError = err instanceof ApiError ? err.message : "Something went wrong";
          }
        }
      }

      setData({ dashboard, quote, quoteError, offsetPurchased });
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

  const refreshQuote = useCallback(async () => {
    try {
      const quote = await postOffsetQuote();
      setData((prev) => (prev ? { ...prev, quote, quoteError: null } : prev));
    } catch (err) {
      setData((prev) =>
        prev
          ? { ...prev, quote: null, quoteError: err instanceof ApiError ? err.message : "Something went wrong" }
          : prev,
      );
    }
  }, []);

  const purchaseOffset = useCallback(async () => {
    if (!data?.quote) return;
    setConfirming(true);
    try {
      await postOffset(data.quote.id);
      setData((prev) => (prev ? { ...prev, quote: null, offsetPurchased: true } : prev));
      setSheetOpen(false);
      fetchAll(true);
    } finally {
      setConfirming(false);
    }
  }, [data?.quote, fetchAll]);

  return {
    status,
    data,
    error,
    refreshing,
    refetch: () => fetchAll(true),
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    confirming,
    purchaseOffset,
    refreshQuote,
  };
}
